#!/bin/bash
###########################################################################
#
#  Copyright 2022 Google Inc.
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#      https://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
#

cat <<END 
******** Welcome **********
*
* Google Tag Manager Database Setup
*
***************************
END
read -p "Please enter your Google Cloud Project ID: " project_id
echo "~~~~~~~~ Enabling APIs ~~~~~~~~~~"
gcloud services enable \
cloudbuild.googleapis.com \
cloudfunctions.googleapis.com \
bigquery.googleapis.com \
cloudscheduler.googleapis.com \
appengine.googleapis.com \
tagmanager.googleapis.com \
--async

gcloud app create

exit_setup () {
  exit "Exiting Google Tag Manager Database setup. Setup failed."
}

create_service_account () {
  gcloud iam service-accounts create $service_account_name \
    --display-name=$service_account_name
}

set_service_account_email () {
  if [[ service_account_email = "" || $1 < 3 ]]; then
    echo "Service account email attempt $1"
    sleep 2
    retry_attempt=$(( $1 + 1 ))
    set_service_account_email "$retry_attempt"
  else
    echo $service_account_email
  fi
}

set_service_account_iam_policy () {
  gcloud projects add-iam-policy-binding $project_id \
    --member="serviceAccount:$service_account_email" \
    --role="roles/editor"
}

service_account_setup () {
  read -p "Please enter you desired service account name with no spaces.
This service account will be used by your Cloud Function.
The recommended name is 'gtm-database' : " service_account_name
  echo "~~~~~~~~ Creating Service Account ~~~~~~~~~~"
  if create_service_account; then
    service_account_email="$service_account_name@$project_id.iam.gserviceaccount.com"
    if set_service_account_iam_policy; then
      echo "Service account created."
    else
      read -p  "Service account creation failed. Try again? y/n: " exit_response
      if [ $exit_response = "n" ]; then
        exit_setup
      else
        service_account_setup
      fi
    fi
  else
    read -p  "Service account creation failed. Try again? y/n: " exit_response
    if [ $exit_response = "n" ]; then
      exit_setup
    else
      create_service_account
    fi
  fi
}

service_account_setup

create_cloud_function () {
  gcloud functions deploy $function_name \
  	--project=$project_id \
  	--runtime=node16 \
  	--service-account=$service_account_email \
  	--memory=1GB \
  	--timeout=4000s \
  	--trigger-http \
  	--entry-point=gtmDownloader \
		--gen2
}

cloud_function_setup () {
	read -p "Please enter your desired Function name. The recommended
function name is 'gtm_downloader': " function_name
  cd functions/gtm-downloader
  echo "~~~~~~~~ Creating Function ~~~~~~~~~~"
	if create_cloud_function; then
	  cd ../..
	  echo "Function created."
  else
    cd ../..
    read -p  "Function creation failed. Try again? y/n: " exit_response
    if [ $exit_response = "n" ]; then
      exit_setup
    else
      cloud_function_setup
    fi
  fi
}

cloud_function_setup

echo "~~~~~~~~ Creating BigQuery Dataset ~~~~~~~~~~"
bq mk -d $project_id:gtm_database
echo "~~~~~~~~ Creating BigQuery Tables ~~~~~~~~~~"
cd bigquery/schemas
bq mk -t --time_partitioning_type=DAY \
	--schema=./gtm_accounts.json \
	$project_id:gtm_database.gtm_account_summaries
bq mk -t --time_partitioning_type=DAY \
	--schema=./gtm_containers.json \
	$project_id:gtm_database.gtm_containers
bq mk -t --time_partitioning_type=DAY \
	--schema=./gtm_tags.json \
	$project_id:gtm_database.gtm_tags
bq mk -t --time_partitioning_type=DAY \
	--schema=./gtm_variables.json \
	$project_id:gtm_database.gtm_variables
bq mk -t --time_partitioning_type=DAY \
	--schema=./gtm_built_in_variables.json \
	$project_id:gtm_database.gtm_built_in_variables
bq mk -t --time_partitioning_type=DAY \
	--schema=./gtm_triggers.json \
	$project_id:gtm_database.gtm_triggers
cd ../..
echo "BigQuery tables created."

create_cloud_scheduler () {
  gcloud scheduler jobs create http $scheduler_name \
  	--schedule "0 23 * * *" \
    --uri="$function_uri" \
  	--http-method=GET \
  	--oidc-service-account-email=$service_account_email \
    --oidc-token-audience=$function_uri \
    --project=$project_id
}

cloud_scheduler_setup () {
	read -p "Please enter your desired Cloud Scheduler name.
The recommended scheduler name is 'gtm_downloader': " scheduler_name
  echo "A cloud scheduler will now be created that runs daily at 11 PM."
	echo "~~~~~~~~ Creating Cloud Scheduler ~~~~~~~~~~"
	function_uri=$(gcloud functions describe $function_name --format="value(httpsTrigger.url)")
	echo $function_uri
  if gcloud app browse; then
    gcloud app create
  fi
	if create_cloud_scheduler; then
    echo "Cloud scheduler created."
  else
    cd ..
    read -p  "Schedule job creation failed. Try again? y/n: " exit_response
    if [ $exit_response = "n" ]; then
      exit_setup
    else
      cloud_scheduler_setup
    fi
  fi
}

cloud_scheduler_setup

echo "***************************
*
* Google Tag Manager Database Setup Complete!
*
* You must now grant $service_account_email access to your Google Tag Manager
* Accounts. This will be the email Google Cloud uses to access your Google
* Tag Manager settings.
***************************"