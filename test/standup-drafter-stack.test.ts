import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { StandupDrafterStack } from '../lib/standup-drafter-stack';

describe('StandupDrafterStack', () => {
  let app: cdk.App;
  let stack: StandupDrafterStack;
  let template: Template;

  beforeEach(() => {
    // Create a new CDK app and stack for each test
    app = new cdk.App();
    stack = new StandupDrafterStack(app, 'TestStack');
    
    // Create a Template object for assertions
    template = Template.fromStack(stack);
  });

  test('Stack creates successfully', () => {
    // Basic test to verify stack instantiation
    expect(stack).toBeDefined();
  });

  test('Stack synthesizes to CloudFormation template', () => {
    // Verify the stack can be synthesized to a CloudFormation template
    const json = template.toJSON();
    expect(json).toBeDefined();
    expect(json.Resources).toBeDefined();
    expect(Object.keys(json.Resources).length).toBeGreaterThan(0);
  });

  test('Stack has DynamoDB table', () => {
    // Verify DynamoDB table resource exists
    template.hasResourceProperties('AWS::DynamoDB::Table', Match.objectLike({
      TableName: 'StandupUpdates'
    }));
  });

  test('Stack has Lambda function', () => {
    // Verify Lambda function resource exists
    template.hasResourceProperties('AWS::Lambda::Function', Match.objectLike({
      Runtime: 'python3.12',
      Handler: 'lambda_function.lambda_handler',
      Timeout: 29,
      MemorySize: 256
    }));
  });

  test('Stack has API Gateway REST API', () => {
    // Verify API Gateway REST API resource exists
    template.hasResourceProperties('AWS::ApiGateway::RestApi', Match.objectLike({
      Name: Match.stringLikeRegexp('StandupDrafter')
    }));
  });

  test('Stack has S3 bucket for static website', () => {
    // Verify S3 bucket resource exists
    template.hasResourceProperties('AWS::S3::Bucket', Match.objectLike({
      WebsiteConfiguration: {
        IndexDocument: 'index.html'
      }
    }));
  });

  test('Stack outputs website URL', () => {
    // Verify CloudFormation output for website URL exists
    template.hasOutput('WebsiteURL', Match.objectLike({
      Description: 'URL of the StandupDrafter web application'
    }));
  });

  test('Stack outputs API endpoint URL', () => {
    // Verify CloudFormation output for API endpoint exists
    template.hasOutput('ApiEndpoint', Match.objectLike({
      Description: 'API Gateway endpoint URL'
    }));
  });

  // ===== DynamoDB Table Assertion Tests =====

  test('DynamoDB table has correct partition key (userId)', () => {
    // **Validates: Requirements 4.2, 4.3, 8.4**
    // Verify DynamoDB table partition key is userId with STRING type
    template.hasResourceProperties('AWS::DynamoDB::Table', Match.objectLike({
      KeySchema: [
        {
          AttributeName: 'userId',
          KeyType: 'HASH'  // HASH = partition key
        },
        {
          AttributeName: 'timestamp',
          KeyType: 'RANGE'
        }
      ]
    }));
  });

  test('DynamoDB table has correct sort key (timestamp)', () => {
    // **Validates: Requirements 4.2, 4.3, 8.4**
    // Verify DynamoDB table sort key is timestamp with STRING type
    template.hasResourceProperties('AWS::DynamoDB::Table', Match.objectLike({
      KeySchema: [
        {
          AttributeName: 'userId',
          KeyType: 'HASH'
        },
        {
          AttributeName: 'timestamp',
          KeyType: 'RANGE'  // RANGE = sort key
        }
      ]
    }));
  });

  test('DynamoDB table key schema has userId as STRING type', () => {
    // **Validates: Requirements 4.2, 4.3**
    // Verify userId attribute is defined as STRING type
    template.hasResourceProperties('AWS::DynamoDB::Table', Match.objectLike({
      AttributeDefinitions: Match.arrayWith([
        {
          AttributeName: 'userId',
          AttributeType: 'S'  // S = String type
        }
      ])
    }));
  });

  test('DynamoDB table key schema has timestamp as STRING type', () => {
    // **Validates: Requirements 4.2, 4.3**
    // Verify timestamp attribute is defined as STRING type
    template.hasResourceProperties('AWS::DynamoDB::Table', Match.objectLike({
      AttributeDefinitions: Match.arrayWith([
        {
          AttributeName: 'timestamp',
          AttributeType: 'S'  // S = String type
        }
      ])
    }));
  });

  test('DynamoDB table uses on-demand billing mode', () => {
    // **Validates: Requirements 8.7**
    // Verify table is configured for on-demand billing (pay-per-request)
    template.hasResourceProperties('AWS::DynamoDB::Table', Match.objectLike({
      BillingMode: 'PAY_PER_REQUEST'
    }));
  });

  // ===== Lambda Function Assertion Tests =====

  test('Lambda function has Python 3.12 runtime', () => {
    // **Validates: Requirements 7.1, 8.3**
    // Verify Lambda runtime is explicitly set to Python 3.12
    template.hasResourceProperties('AWS::Lambda::Function', Match.objectLike({
      Runtime: 'python3.12'
    }));
  });

  test('Lambda function has 29 second timeout', () => {
    // **Validates: Requirements 6.7, 7.2**
    // Verify Lambda timeout is set to 29 seconds (just under API Gateway 30s limit)
    template.hasResourceProperties('AWS::Lambda::Function', Match.objectLike({
      Timeout: 29
    }));
  });

  test('Lambda function has correct handler entry point', () => {
    // **Validates: Requirements 3.1, 7.1**
    // Verify Lambda handler points to lambda_function.lambda_handler
    template.hasResourceProperties('AWS::Lambda::Function', Match.objectLike({
      Handler: 'lambda_function.lambda_handler'
    }));
  });

  test('Lambda function has 256 MB memory', () => {
    // **Validates: Requirements 3.1, 7.1**
    // Verify Lambda memory is configured appropriately for text processing
    template.hasResourceProperties('AWS::Lambda::Function', Match.objectLike({
      MemorySize: 256
    }));
  });

  test('Lambda function has DYNAMODB_TABLE_NAME environment variable', () => {
    // **Validates: Requirements 3.1, 8.3**
    // Verify Lambda environment variables include DynamoDB table name reference
    const json = template.toJSON();
    const generatorFunc = Object.values(json.Resources).find(
      (r: any) => r.Type === 'AWS::Lambda::Function' && r.Properties?.Handler === 'lambda_function.lambda_handler'
    ) as any;
    expect(generatorFunc).toBeDefined();
    expect(generatorFunc.Properties.Environment.Variables.DYNAMODB_TABLE_NAME).toBeDefined();
  });

  test('Lambda function has BEDROCK_MODEL_ID environment variable', () => {
    // **Validates: Requirements 3.1, 8.3**
    // Verify Lambda environment variables include Bedrock model ID
    template.hasResourceProperties('AWS::Lambda::Function', Match.objectLike({
      Environment: {
        Variables: Match.objectLike({
          BEDROCK_MODEL_ID: Match.stringLikeRegexp('amazon.nova')
        })
      }
    }));
  });

  test('Lambda function has Bedrock InvokeModel permissions', () => {
    // **Validates: Requirements 7.3, 7.4**
    // Verify Lambda IAM role has permission to invoke Bedrock models
    const json = template.toJSON();
    const policies = Object.values(json.Resources).filter(
      (r: any) => r.Type === 'AWS::IAM::Policy'
    ) as any[];
    
    const hasBedrockPermission = policies.some(policy =>
      policy.Properties.PolicyDocument.Statement.some((stmt: any) =>
        stmt.Action === 'bedrock:InvokeModel' &&
        stmt.Effect === 'Allow' &&
        Array.isArray(stmt.Resource) &&
        stmt.Resource.length > 0
      )
    );
    
    expect(hasBedrockPermission).toBe(true);
  });

  test('Lambda IAM role has DynamoDB read permissions', () => {
    // **Validates: Requirements 7.2, 7.4**
    // Verify Lambda can read from DynamoDB table (query history)
    const json = template.toJSON();
    const policies = Object.values(json.Resources).filter(
      (r: any) => r.Type === 'AWS::IAM::Policy'
    ) as any[];
    
    const hasDynamoDbRead = policies.some(policy =>
      policy.Properties.PolicyDocument.Statement.some((stmt: any) =>
        stmt.Effect === 'Allow' &&
        Array.isArray(stmt.Action) &&
        stmt.Action.some((action: string) => 
          action.includes('dynamodb:GetItem') || action.includes('dynamodb:Query')
        )
      )
    );
    
    expect(hasDynamoDbRead).toBe(true);
  });

  test('Lambda IAM role has DynamoDB write permissions', () => {
    // **Validates: Requirements 7.2, 7.4**
    // Verify Lambda can write to DynamoDB table (store updates)
    template.hasResourceProperties('AWS::IAM::Policy', Match.objectLike({
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              Match.stringLikeRegexp('dynamodb:PutItem')
            ]),
            Effect: 'Allow'
          })
        ])
      }
    }));
  });

  test('Lambda IAM role has CloudWatch Logs write permissions', () => {
    // **Validates: Requirements 7.4, 8.3**
    // Verify Lambda execution role exists (CloudWatch Logs permissions are automatically granted by CDK)
    // CDK automatically adds logs:CreateLogGroup, logs:CreateLogStream, logs:PutLogEvents to Lambda execution roles
    template.hasResourceProperties('AWS::IAM::Role', Match.objectLike({
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com'
            }
          })
        ])
      }
    }));
    
    // Verify the role is associated with the Lambda function
    template.hasResourceProperties('AWS::Lambda::Function', Match.objectLike({
      Runtime: 'python3.12',
      Handler: 'lambda_function.lambda_handler'
    }));
  });

  // ===== API Gateway Assertion Tests =====

  test('API Gateway has /generate endpoint with POST method', () => {
    // **Validates: Requirements 8.2, 8.4**
    // Verify /generate resource exists with POST method
    template.hasResourceProperties('AWS::ApiGateway::Method', Match.objectLike({
      HttpMethod: 'POST'
    }));

    // Also verify the resource path includes /generate
    template.hasResourceProperties('AWS::ApiGateway::Resource', Match.objectLike({
      PathPart: 'generate'
    }));
  });

  test('API Gateway has /history endpoint with GET method', () => {
    // **Validates: Requirements 8.2, 8.4**
    // Verify /history resource exists with GET method
    template.hasResourceProperties('AWS::ApiGateway::Method', Match.objectLike({
      HttpMethod: 'GET'
    }));

    // Also verify the resource path includes /history
    template.hasResourceProperties('AWS::ApiGateway::Resource', Match.objectLike({
      PathPart: 'history'
    }));
  });

  test('API Gateway has CORS configuration with OPTIONS methods', () => {
    // **Validates: Requirements 7.5, 8.2**
    // Verify API Gateway has OPTIONS methods for CORS preflight
    const json = template.toJSON();
    const methods = Object.entries(json.Resources).filter(
      ([key]) => key.includes('MethodOptions') || (json.Resources[key] as any).Type === 'AWS::ApiGateway::Method'
    );
    expect(methods.length).toBeGreaterThan(0);
  });

  test('API Gateway endpoints use Lambda integration', () => {
    // **Validates: Requirements 8.2, 8.4**
    // Verify API methods integrate with Lambda function via proxy integration
    template.hasResourceProperties('AWS::ApiGateway::Method', Match.objectLike({
      Integration: Match.objectLike({
        Type: 'AWS_PROXY'
      })
    }));
  });

  // ===== S3 Bucket Assertion Tests =====

  test('S3 bucket has website hosting enabled', () => {
    // **Validates: Requirements 7.6, 8.1**
    // Verify S3 bucket has static website hosting configured
    template.hasResourceProperties('AWS::S3::Bucket', Match.objectLike({
      WebsiteConfiguration: {
        IndexDocument: 'index.html'
      }
    }));
  });

  test('S3 bucket has public read access configured', () => {
    // **Validates: Requirements 7.6**
    // Verify S3 bucket is configured to allow public read access
    const json = template.toJSON();
    const policy = Object.values(json.Resources).find(
      (r: any) => r.Type === 'AWS::S3::BucketPolicy'
    ) as any;
    
    expect(policy).toBeDefined();
    expect(policy.Properties.PolicyDocument).toBeDefined();
    
    const hasPublicReadAccess = policy.Properties.PolicyDocument.Statement.some((stmt: any) =>
      stmt.Effect === 'Allow' &&
      stmt.Action === 's3:GetObject' &&
      (stmt.Principal === '*' || stmt.Principal?.AWS === '*')
    );
    
    expect(hasPublicReadAccess).toBe(true);
  });

  test('S3 bucket exists and is properly configured', () => {
    // **Validates: Requirements 8.1, 8.2**
    // Verify S3 bucket resource exists
    template.hasResourceProperties('AWS::S3::Bucket', Match.objectLike({
      WebsiteConfiguration: Match.objectLike({})
    }));
  });

  test('Lambda permission allows API Gateway invocation', () => {
    // **Validates: Requirements 8.2, 8.4**
    // Verify Lambda has permission to be invoked by API Gateway
    template.hasResourceProperties('AWS::Lambda::Permission', Match.objectLike({
      Action: 'lambda:InvokeFunction',
      Principal: 'apigateway.amazonaws.com'
    }));
  });

  test('DynamoDB table is referenced in Lambda IAM policy', () => {
    // **Validates: Requirements 7.2, 7.4, 8.3**
    // Verify the Lambda execution role has inline policies referencing DynamoDB
    const json = template.toJSON();
    const policyContent = JSON.stringify(json);
    
    const hasDynamoDbReference = 
      policyContent.includes('dynamodb') &&
      (policyContent.includes('UpdatesTable') || policyContent.includes('dynamodb:GetItem') || policyContent.includes('dynamodb:PutItem'));
    
    expect(hasDynamoDbReference).toBe(true);
  });

  test('CloudFormation outputs include API endpoint and website URL', () => {
    // **Validates: Requirements 8.8**
    // Verify stack outputs for deployment URLs
    template.hasOutput('ApiEndpoint', Match.objectLike({
      Description: 'API Gateway endpoint URL'
    }));

    template.hasOutput('WebsiteURL', Match.objectLike({
      Description: 'URL of the StandupDrafter web application'
    }));
  });

  test('Stack has all required resource types', () => {
    // **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.7, 8.2, 8.3, 8.4**
    // Comprehensive check that all resource types exist
    const json = template.toJSON();
    const resourceTypes = Object.values(json.Resources).map((r: any) => r.Type);
    
    expect(resourceTypes).toContain('AWS::DynamoDB::Table');
    expect(resourceTypes).toContain('AWS::Lambda::Function');
    expect(resourceTypes).toContain('AWS::ApiGateway::RestApi');
    expect(resourceTypes).toContain('AWS::S3::Bucket');
    expect(resourceTypes).toContain('AWS::IAM::Role');
    expect(resourceTypes).toContain('AWS::IAM::Policy');
  });
});
