import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';

export class StandupDrafterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table for storing update history
    const updatesTable = new dynamodb.Table(this, 'UpdatesTable', {
      partitionKey: { 
        name: 'userId', 
        type: dynamodb.AttributeType.STRING 
      },
      sortKey: { 
        name: 'timestamp', 
        type: dynamodb.AttributeType.STRING 
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand for Free Tier optimization
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Development environment - auto-delete on stack removal
      tableName: 'StandupUpdates'
    });

    // Export table name for Lambda function reference
    new cdk.CfnOutput(this, 'UpdatesTableName', {
      value: updatesTable.tableName,
      description: 'DynamoDB table name for storing standup updates',
      exportName: 'StandupUpdatesTableName'
    });

    // Lambda function for processing requests
    const generatorFunction = new lambda.Function(this, 'GeneratorFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset('lambda'),
      timeout: cdk.Duration.seconds(29),
      memorySize: 256,
      environment: {
        DYNAMODB_TABLE_NAME: updatesTable.tableName
      }
    });

    // Grant DynamoDB read/write permissions to Lambda
    updatesTable.grantReadWriteData(generatorFunction);

    // CloudWatch Logs permissions are automatically granted by CDK for Lambda functions
    
    // REST API Gateway
    const api = new apigateway.RestApi(this, 'StandupApi', {
      restApiName: 'StandupDrafter API',
      description: 'API for StandupDrafter application',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Requested-With'],
        maxAge: cdk.Duration.seconds(3600)
      }
    });

    // Lambda integration with proxy integration enabled
    const lambdaIntegration = new apigateway.LambdaIntegration(generatorFunction, {
      proxy: true
    });
    
    // POST /generate endpoint
    const generateResource = api.root.addResource('generate');
    generateResource.addMethod('POST', lambdaIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Headers': true
          }
        }
      ]
    });

    // GET /history endpoint
    const historyResource = api.root.addResource('history');
    historyResource.addMethod('GET', lambdaIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Headers': true
          }
        }
      ]
    });

    // Output API Gateway endpoint URL
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
      exportName: 'StandupDrafterApiEndpoint'
    });
    
    // S3 bucket for static website hosting
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // Deploy frontend files to S3 bucket
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('frontend')],
      destinationBucket: websiteBucket
    });

    // CloudFormation output for bucket website URL
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: websiteBucket.bucketWebsiteUrl,
      description: 'URL of the StandupDrafter web application'
    });
  }
}
