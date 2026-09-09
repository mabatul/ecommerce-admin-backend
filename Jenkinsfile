// Pipeline for THIS repo only. Triggers and deploys independently of
// infra/frontend — doesn't depend on another job having run first.
//
// Deploying to Railway requires a Jenkins credential of type "Secret text"
// with id 'railway-token-backend' (a Railway Project Token, generated from
// the project dashboard -> Settings -> Tokens) and, optionally, the
// RAILWAY_SERVICE variable if the service name doesn't match Railway's
// default. See README.md.
pipeline {
  agent any

  environment {
    RAILWAY_SERVICE = 'ecommerce-admin-backend'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install') {
      steps { sh 'npm ci' }
    }

    stage('Lint') {
      steps { sh 'npm run lint' }
    }

    stage('Build') {
      steps { sh 'npm run build' }
    }

    stage('Build Docker image') {
      steps { sh 'docker build -f Dockerfile.ci -t ecommerce-admin-backend:${BUILD_NUMBER} .' }
    }

    // Note: no `when { branch ... }` on purpose — this job is set up as a
    // plain "Pipeline script from SCM" (not Multibranch), where BRANCH_NAME
    // isn't available and that when would never be true. Run manually with
    // "Build Now" when you want to deploy.
    stage('Deploy to Railway (dev)') {
      steps {
        withCredentials([string(credentialsId: 'railway-token-backend', variable: 'RAILWAY_TOKEN')]) {
          sh '''
            npm i -g @railway/cli
            railway up --service "$RAILWAY_SERVICE" --detach
          '''
        }
      }
    }
  }
}
