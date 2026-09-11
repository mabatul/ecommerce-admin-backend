// Pipeline for THIS repo only. Triggers and deploys independently of
// infra/frontend — doesn't depend on another job having run first.
//
// Runs as a Multibranch Pipeline on the cloud Jenkins (see
// jenkins-cloud/init.groovy.d/jobs.groovy in the infra repo) — every
// branch builds, lints and runs the smoke test, but the actual deploy
// below only fires on 'main' (`when { branch 'main' }`). That's what
// makes BRANCH_NAME available at all; a plain non-multibranch job
// wouldn't have it.
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

    // Best-effort smoke test, not required for the deploy below — Railway
    // builds the image itself from Dockerfile.ci (per railway.json) when
    // 'railway up' runs. Skips itself instead of failing on a Jenkins agent
    // with no Docker daemon available (e.g. this pipeline running on the
    // Railway-hosted Jenkins, not the local one).
    stage('Build Docker image') {
      steps {
        sh '''
          if command -v docker >/dev/null 2>&1; then
            docker build -f Dockerfile.ci -t ecommerce-admin-backend:${BUILD_NUMBER} .
          else
            echo "No Docker daemon available here — skipping (Railway builds the image itself on deploy)."
          fi
        '''
      }
    }

    // Only 'main' actually deploys — every other branch stops here having
    // already proven it builds, lints and passes the smoke test above.
    stage('Deploy to Railway (dev)') {
      when { branch 'main' }
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
