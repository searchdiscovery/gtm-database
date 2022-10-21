# Google Tag Manager Downloader

Created and maintained by @tyssejc (charlie.tysse@searchdiscovery.com)

The goal of this project is to allow a client to be able to create a Looker Studio dashboard that gives him a "panopticon" view of all the hundreds of GTM containers he manages.

## Approach
Will be very similar to the [google/analytics-settings-database](https://github.com/google/analytics-settings-database) utility, only for GTM instead of GA.

## Todo

Here's where I'm keeping track of things that need to be done, as the project matures I'd like to switch to Issues.

- [x] Create a repo
- [x] Create a Service Account
- [x] Figure out how to authenticate a Cloud Function with the GTM nodejs client (surprise, there's no python client for the GTM API)
- [ ] Create a BigQuery dataset
- [ ] Design schemas for each table in the BQ dataset
- [ ] Extend the Cloud Function to:
  - [ ] only allow certain GTM accounts to be accessed
  - [ ] for all available GTM accounts, fetch a list of all containers and their metadata and send to BQ table(s)
  - for all available containers
    - [ ] fetch all tags and their metadata and send to BQ table(s)
    - [ ] fetch all tags and their metadata and send to BQ table(s)
    - [ ] fetch all tags and their metadata and send to BQ table(s)
- [ ] Create a Cloud Bucket
- [ ] Create a Cloud Scheduler job to run every night
- [ ] Create a shell script to be run in Cloud Console that will automate this process


## Setup

- a service account client key (not included, please hmu for it)
- gcloud SDK (for deploying Cloud Functions)
- node lts/gallium (^16.18.0)

