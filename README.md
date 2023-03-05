# Google Tag Manager Downloader

Created and maintained by [tyssejc](https://github.com/tyssejc) (charlie.tysse at searchdiscovery dot com).

The goal of this project is to allow you to have a Looker Studio dashboard that provides a "panopticon" view of all the GTM containers you manage.

## Kudos
This project was heavily inspired by [b-kuehn](https://github.com/b-kuehn)'s excellent [google/analytics-settings-database](https://github.com/google/analytics-settings-database) utility. 

## Requirements
- [Google Cloud Platform (GCP) project](https://cloud.google.com/resource-manager/docs/creating-managing-projects) with [billing enabled](https://cloud.google.com/billing/docs/how-to/modify-project#enable-billing) - Create or use an existing project as needed.
  -  Note: This solution uses billable GCP resources.
- [Google Tag Manager](https://tagmanager.google.com/)

## Implementation
1. Navigate to your Google Cloud project and open Cloud Shell
2. Enter the following into Cloud Shell:
  ```bash
  rm -rf gtm-database && git clone https://github.com/searchdiscovery/gtm-database.git && cd gtm-database && bash deploy.sh
  ```
3. Enter the information when prompted during the deployment process.
  a. When asked if unauthenticated invocations should be allowed for the Cloud Function, answer **no**.
4. When finished, add the service account email generated during the deployment process to your Google Tag Manager accounts.

This will create the following:
- A Cloud Function (2nd gen)
- A Cloud Scheduler Job
- A BigQuery dataset with the name "gtm_database"
- The following tables:
  - gtm_accounts
  - gtm_containers
  - gtm_tags
  - gtm_variables
  - gtm_built_in_variables
  - gtm_triggers
- A service account with the Editor role