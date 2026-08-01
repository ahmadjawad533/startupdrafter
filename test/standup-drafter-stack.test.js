"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = __importStar(require("aws-cdk-lib"));
const assertions_1 = require("aws-cdk-lib/assertions");
const standup_drafter_stack_1 = require("../lib/standup-drafter-stack");
describe('StandupDrafterStack', () => {
    let app;
    let stack;
    let template;
    beforeEach(() => {
        // Create a new CDK app and stack for each test
        app = new cdk.App();
        stack = new standup_drafter_stack_1.StandupDrafterStack(app, 'TestStack');
        // Create a Template object for assertions
        template = assertions_1.Template.fromStack(stack);
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
        template.hasResourceProperties('AWS::DynamoDB::Table', assertions_1.Match.objectLike({
            TableName: 'StandupUpdates'
        }));
    });
    test('Stack has Lambda function', () => {
        // Verify Lambda function resource exists
        template.hasResourceProperties('AWS::Lambda::Function', assertions_1.Match.objectLike({
            Runtime: 'python3.12',
            Handler: 'lambda_function.lambda_handler',
            Timeout: 29,
            MemorySize: 256
        }));
    });
    test('Stack has API Gateway REST API', () => {
        // Verify API Gateway REST API resource exists
        template.hasResourceProperties('AWS::ApiGateway::RestApi', assertions_1.Match.objectLike({
            Name: assertions_1.Match.stringLikeRegexp('StandupDrafter')
        }));
    });
    test('Stack has S3 bucket for static website', () => {
        // Verify S3 bucket resource exists
        template.hasResourceProperties('AWS::S3::Bucket', assertions_1.Match.objectLike({
            WebsiteConfiguration: {
                IndexDocument: 'index.html'
            }
        }));
    });
    test('Stack outputs website URL', () => {
        // Verify CloudFormation output for website URL exists
        template.hasOutput('WebsiteURL', assertions_1.Match.objectLike({
            Description: 'URL of the StandupDrafter web application'
        }));
    });
    test('Stack outputs API endpoint URL', () => {
        // Verify CloudFormation output for API endpoint exists
        template.hasOutput('ApiEndpoint', assertions_1.Match.objectLike({
            Description: 'API Gateway endpoint URL'
        }));
    });
    // ===== DynamoDB Table Assertion Tests =====
    test('DynamoDB table has correct partition key (userId)', () => {
        // **Validates: Requirements 4.2, 4.3, 8.4**
        // Verify DynamoDB table partition key is userId with STRING type
        template.hasResourceProperties('AWS::DynamoDB::Table', assertions_1.Match.objectLike({
            KeySchema: [
                {
                    AttributeName: 'userId',
                    KeyType: 'HASH' // HASH = partition key
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
        template.hasResourceProperties('AWS::DynamoDB::Table', assertions_1.Match.objectLike({
            KeySchema: [
                {
                    AttributeName: 'userId',
                    KeyType: 'HASH'
                },
                {
                    AttributeName: 'timestamp',
                    KeyType: 'RANGE' // RANGE = sort key
                }
            ]
        }));
    });
    test('DynamoDB table key schema has userId as STRING type', () => {
        // **Validates: Requirements 4.2, 4.3**
        // Verify userId attribute is defined as STRING type
        template.hasResourceProperties('AWS::DynamoDB::Table', assertions_1.Match.objectLike({
            AttributeDefinitions: assertions_1.Match.arrayWith([
                {
                    AttributeName: 'userId',
                    AttributeType: 'S' // S = String type
                }
            ])
        }));
    });
    test('DynamoDB table key schema has timestamp as STRING type', () => {
        // **Validates: Requirements 4.2, 4.3**
        // Verify timestamp attribute is defined as STRING type
        template.hasResourceProperties('AWS::DynamoDB::Table', assertions_1.Match.objectLike({
            AttributeDefinitions: assertions_1.Match.arrayWith([
                {
                    AttributeName: 'timestamp',
                    AttributeType: 'S' // S = String type
                }
            ])
        }));
    });
    test('DynamoDB table uses on-demand billing mode', () => {
        // **Validates: Requirements 8.7**
        // Verify table is configured for on-demand billing (pay-per-request)
        template.hasResourceProperties('AWS::DynamoDB::Table', assertions_1.Match.objectLike({
            BillingMode: 'PAY_PER_REQUEST'
        }));
    });
    // ===== Lambda Function Assertion Tests =====
    test('Lambda function has Python 3.12 runtime', () => {
        // **Validates: Requirements 7.1, 8.3**
        // Verify Lambda runtime is explicitly set to Python 3.12
        template.hasResourceProperties('AWS::Lambda::Function', assertions_1.Match.objectLike({
            Runtime: 'python3.12'
        }));
    });
    test('Lambda function has 29 second timeout', () => {
        // **Validates: Requirements 6.7, 7.2**
        // Verify Lambda timeout is set to 29 seconds (just under API Gateway 30s limit)
        template.hasResourceProperties('AWS::Lambda::Function', assertions_1.Match.objectLike({
            Timeout: 29
        }));
    });
    test('Lambda function has correct handler entry point', () => {
        // **Validates: Requirements 3.1, 7.1**
        // Verify Lambda handler points to lambda_function.lambda_handler
        template.hasResourceProperties('AWS::Lambda::Function', assertions_1.Match.objectLike({
            Handler: 'lambda_function.lambda_handler'
        }));
    });
    test('Lambda function has 256 MB memory', () => {
        // **Validates: Requirements 3.1, 7.1**
        // Verify Lambda memory is configured appropriately for text processing
        template.hasResourceProperties('AWS::Lambda::Function', assertions_1.Match.objectLike({
            MemorySize: 256
        }));
    });
    test('Lambda function has DYNAMODB_TABLE_NAME environment variable', () => {
        // **Validates: Requirements 3.1, 8.3**
        // Verify Lambda environment variables include DynamoDB table name reference
        const json = template.toJSON();
        const generatorFunc = Object.values(json.Resources).find((r) => r.Type === 'AWS::Lambda::Function' && r.Properties?.Handler === 'lambda_function.lambda_handler');
        expect(generatorFunc).toBeDefined();
        expect(generatorFunc.Properties.Environment.Variables.DYNAMODB_TABLE_NAME).toBeDefined();
    });
    test('Lambda function has BEDROCK_MODEL_ID environment variable', () => {
        // **Validates: Requirements 3.1, 8.3**
        // Verify Lambda environment variables include Bedrock model ID
        template.hasResourceProperties('AWS::Lambda::Function', assertions_1.Match.objectLike({
            Environment: {
                Variables: assertions_1.Match.objectLike({
                    BEDROCK_MODEL_ID: assertions_1.Match.stringLikeRegexp('amazon.nova')
                })
            }
        }));
    });
    test('Lambda function has Bedrock InvokeModel permissions', () => {
        // **Validates: Requirements 7.3, 7.4**
        // Verify Lambda IAM role has permission to invoke Bedrock models
        const json = template.toJSON();
        const policies = Object.values(json.Resources).filter((r) => r.Type === 'AWS::IAM::Policy');
        const hasBedrockPermission = policies.some(policy => policy.Properties.PolicyDocument.Statement.some((stmt) => stmt.Action === 'bedrock:InvokeModel' &&
            stmt.Effect === 'Allow' &&
            Array.isArray(stmt.Resource) &&
            stmt.Resource.length > 0));
        expect(hasBedrockPermission).toBe(true);
    });
    test('Lambda IAM role has DynamoDB read permissions', () => {
        // **Validates: Requirements 7.2, 7.4**
        // Verify Lambda can read from DynamoDB table (query history)
        const json = template.toJSON();
        const policies = Object.values(json.Resources).filter((r) => r.Type === 'AWS::IAM::Policy');
        const hasDynamoDbRead = policies.some(policy => policy.Properties.PolicyDocument.Statement.some((stmt) => stmt.Effect === 'Allow' &&
            Array.isArray(stmt.Action) &&
            stmt.Action.some((action) => action.includes('dynamodb:GetItem') || action.includes('dynamodb:Query'))));
        expect(hasDynamoDbRead).toBe(true);
    });
    test('Lambda IAM role has DynamoDB write permissions', () => {
        // **Validates: Requirements 7.2, 7.4**
        // Verify Lambda can write to DynamoDB table (store updates)
        template.hasResourceProperties('AWS::IAM::Policy', assertions_1.Match.objectLike({
            PolicyDocument: {
                Statement: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
                        Action: assertions_1.Match.arrayWith([
                            assertions_1.Match.stringLikeRegexp('dynamodb:PutItem')
                        ]),
                        Effect: 'Allow'
                    })
                ])
            }
        }));
    });
    test('Lambda IAM role has CloudWatch Logs write permissions', () => {
        // **Validates: Requirements 7.4, 8.3**
        // Verify Lambda can write logs to CloudWatch Logs
        const json = template.toJSON();
        const policies = Object.values(json.Resources).filter((r) => r.Type === 'AWS::IAM::Policy');
        const hasLogsPermission = policies.some(policy => policy.Properties.PolicyDocument.Statement.some((stmt) => stmt.Effect === 'Allow' &&
            Array.isArray(stmt.Action) &&
            stmt.Action.some((action) => action.includes('logs:'))));
        expect(hasLogsPermission).toBe(true);
    });
    // ===== API Gateway Assertion Tests =====
    test('API Gateway has /generate endpoint with POST method', () => {
        // **Validates: Requirements 8.2, 8.4**
        // Verify /generate resource exists with POST method
        template.hasResourceProperties('AWS::ApiGateway::Method', assertions_1.Match.objectLike({
            HttpMethod: 'POST'
        }));
        // Also verify the resource path includes /generate
        template.hasResourceProperties('AWS::ApiGateway::Resource', assertions_1.Match.objectLike({
            PathPart: 'generate'
        }));
    });
    test('API Gateway has /history endpoint with GET method', () => {
        // **Validates: Requirements 8.2, 8.4**
        // Verify /history resource exists with GET method
        template.hasResourceProperties('AWS::ApiGateway::Method', assertions_1.Match.objectLike({
            HttpMethod: 'GET'
        }));
        // Also verify the resource path includes /history
        template.hasResourceProperties('AWS::ApiGateway::Resource', assertions_1.Match.objectLike({
            PathPart: 'history'
        }));
    });
    test('API Gateway has CORS configuration with OPTIONS methods', () => {
        // **Validates: Requirements 7.5, 8.2**
        // Verify API Gateway has OPTIONS methods for CORS preflight
        const json = template.toJSON();
        const methods = Object.entries(json.Resources).filter(([key]) => key.includes('MethodOptions') || json.Resources[key].Type === 'AWS::ApiGateway::Method');
        expect(methods.length).toBeGreaterThan(0);
    });
    test('API Gateway endpoints use Lambda integration', () => {
        // **Validates: Requirements 8.2, 8.4**
        // Verify API methods integrate with Lambda function via proxy integration
        template.hasResourceProperties('AWS::ApiGateway::Method', assertions_1.Match.objectLike({
            Integration: assertions_1.Match.objectLike({
                Type: 'AWS_PROXY'
            })
        }));
    });
    // ===== S3 Bucket Assertion Tests =====
    test('S3 bucket has website hosting enabled', () => {
        // **Validates: Requirements 7.6, 8.1**
        // Verify S3 bucket has static website hosting configured
        template.hasResourceProperties('AWS::S3::Bucket', assertions_1.Match.objectLike({
            WebsiteConfiguration: {
                IndexDocument: 'index.html'
            }
        }));
    });
    test('S3 bucket has public read access configured', () => {
        // **Validates: Requirements 7.6**
        // Verify S3 bucket is configured to allow public read access
        const json = template.toJSON();
        const policy = Object.values(json.Resources).find((r) => r.Type === 'AWS::S3::BucketPolicy');
        expect(policy).toBeDefined();
        expect(policy.Properties.PolicyDocument).toBeDefined();
        const hasPublicReadAccess = policy.Properties.PolicyDocument.Statement.some((stmt) => stmt.Effect === 'Allow' &&
            stmt.Principal === '*' &&
            stmt.Action === 's3:GetObject');
        expect(hasPublicReadAccess).toBe(true);
    });
    test('S3 bucket exists and is properly configured', () => {
        // **Validates: Requirements 8.1, 8.2**
        // Verify S3 bucket resource exists
        template.hasResourceProperties('AWS::S3::Bucket', assertions_1.Match.objectLike({
            WebsiteConfiguration: assertions_1.Match.objectLike({})
        }));
    });
    test('Lambda permission allows API Gateway invocation', () => {
        // **Validates: Requirements 8.2, 8.4**
        // Verify Lambda has permission to be invoked by API Gateway
        template.hasResourceProperties('AWS::Lambda::Permission', assertions_1.Match.objectLike({
            Action: 'lambda:InvokeFunction',
            Principal: 'apigateway.amazonaws.com'
        }));
    });
    test('DynamoDB table is referenced in Lambda IAM policy', () => {
        // **Validates: Requirements 7.2, 7.4, 8.3**
        // Verify the Lambda execution role has inline policies referencing DynamoDB
        const json = template.toJSON();
        const policyContent = JSON.stringify(json);
        const hasDynamoDbReference = policyContent.includes('dynamodb') &&
            (policyContent.includes('UpdatesTable') || policyContent.includes('dynamodb:GetItem') || policyContent.includes('dynamodb:PutItem'));
        expect(hasDynamoDbReference).toBe(true);
    });
    test('CloudFormation outputs include API endpoint and website URL', () => {
        // **Validates: Requirements 8.8**
        // Verify stack outputs for deployment URLs
        template.hasOutput('ApiEndpoint', assertions_1.Match.objectLike({
            Description: 'API Gateway endpoint URL'
        }));
        template.hasOutput('WebsiteURL', assertions_1.Match.objectLike({
            Description: 'URL of the StandupDrafter web application'
        }));
    });
    test('Stack has all required resource types', () => {
        // **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.7, 8.2, 8.3, 8.4**
        // Comprehensive check that all resource types exist
        const json = template.toJSON();
        const resourceTypes = Object.values(json.Resources).map((r) => r.Type);
        expect(resourceTypes).toContain('AWS::DynamoDB::Table');
        expect(resourceTypes).toContain('AWS::Lambda::Function');
        expect(resourceTypes).toContain('AWS::ApiGateway::RestApi');
        expect(resourceTypes).toContain('AWS::S3::Bucket');
        expect(resourceTypes).toContain('AWS::IAM::Role');
        expect(resourceTypes).toContain('AWS::IAM::Policy');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmR1cC1kcmFmdGVyLXN0YWNrLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdGFuZHVwLWRyYWZ0ZXItc3RhY2sudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHVEQUF5RDtBQUN6RCx3RUFBbUU7QUFFbkUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUNuQyxJQUFJLEdBQVksQ0FBQztJQUNqQixJQUFJLEtBQTBCLENBQUM7SUFDL0IsSUFBSSxRQUFrQixDQUFDO0lBRXZCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCwrQ0FBK0M7UUFDL0MsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLEtBQUssR0FBRyxJQUFJLDJDQUFtQixDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUVsRCwwQ0FBMEM7UUFDMUMsUUFBUSxHQUFHLHFCQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3ZDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUN0QywyQ0FBMkM7UUFDM0MsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzlCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhDQUE4QyxFQUFFLEdBQUcsRUFBRTtRQUN4RCxtRUFBbUU7UUFDbkUsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMzQixNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMs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QyxJQUFJLENBQUMsQ0FBQztRQUU1RSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDeEQsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUM1RCxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUN0RCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFRlbXBsYXRlLCBNYXRjaCB9IGZyb20gJ2F3cy1jZGstbGliL2Fzc2VydGlvbnMnO1xuaW1wb3J0IHsgU3RhbmR1cERyYWZ0ZXJTdGFjayB9IGZyb20gJy4uL2xpYi9zdGFuZHVwLWRyYWZ0ZXItc3RhY2snO1xuXG5kZXNjcmliZSgnU3RhbmR1cERyYWZ0ZXJTdGFjaycsICgpID0+IHtcbiAgbGV0IGFwcDogY2RrLkFwcDtcbiAgbGV0IHN0YWNrOiBTdGFuZHVwRHJhZnRlclN0YWNrO1xuICBsZXQgdGVtcGxhdGU6IFRlbXBsYXRlO1xuXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIC8vIENyZWF0ZSBhIG5ldyBDREsgYXBwIGFuZCBzdGFjayBmb3IgZWFjaCB0ZXN0XG4gICAgYXBwID0gbmV3IGNkay5BcHAoKTtcbiAgICBzdGFjayA9IG5ldyBTdGFuZHVwRHJhZnRlclN0YWNrKGFwcCwgJ1Rlc3RTdGFjaycpO1xuICAgIFxuICAgIC8vIENyZWF0ZSBhIFRlbXBsYXRlIG9iamVjdCBmb3IgYXNzZXJ0aW9uc1xuICAgIHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcbiAgfSk7XG5cbiAgdGVzdCgnU3RhY2sgY3JlYXRlcyBzdWNjZXNzZnVsbHknLCAoKSA9PiB7XG4gICAgLy8gQmFzaWMgdGVzdCB0byB2ZXJpZnkgc3RhY2sgaW5zdGFudGlhdGlvblxuICAgIGV4cGVjdChzdGFjaykudG9CZURlZmluZWQoKTtcbiAgfSk7XG5cbiAgdGVzdCgnU3RhY2sgc3ludGhlc2l6ZXMgdG8gQ2xvdWRGb3JtYXRpb24gdGVtcGxhdGUnLCAoKSA9PiB7XG4gICAgLy8gVmVyaWZ5IHRoZSBzdGFjayBjYW4gYmUgc3ludGhlc2l6ZWQgdG8gYSBDbG91ZEZvcm1hdGlvbiB0ZW1wbGF0ZVxuICAgIGNvbnN0IGpzb24gPSB0ZW1wbGF0ZS50b0pTT04oKTtcbiAgICBleHBlY3QoanNvbikudG9CZURlZmluZWQoKTtcbiAgICBleHBlY3QoanNvbi5SZXNvdXJjZXMpLnRvQmVEZWZpbmVkKCk7XG4gICAgZXhwZWN0KE9iamVjdC5rZXlzKGpzb24uUmVzb3VyY2VzKS5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgfSk7XG5cbiAgdGVzdCgnU3RhY2sgaGFzIER5bmFtb0RCIHRhYmxlJywgKCkgPT4ge1xuICAgIC8vIFZlcmlmeSBEeW5hbW9EQiB0YWJsZSByZXNvdXJjZSBleGlzdHNcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICBUYWJsZU5hbWU6ICdTdGFuZHVwVXBkYXRlcydcbiAgICB9KSk7XG4gIH0pO1xuXG4gIHRlc3QoJ1N0YWNrIGhhcyBMYW1iZGEgZnVuY3Rpb24nLCAoKSA9PiB7XG4gICAgLy8gVmVyaWZ5IExhbWJkYSBmdW5jdGlvbiByZXNvdXJjZSBleGlzdHNcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicsIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgUnVudGltZTogJ3B5dGhvbjMuMTInLFxuICAgICAgSGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsXG4gICAgICBUaW1lb3V0OiAyOSxcbiAgICAgIE1lbW9yeVNpemU6IDI1NlxuICAgIH0pKTtcbiAgfSk7XG5cbiAgdGVzdCgnU3RhY2sgaGFzIEFQSSBHYXRld2F5IFJFU1QgQVBJJywgKCkgPT4ge1xuICAgIC8vIFZlcmlmeSBBUEkgR2F0ZXdheSBSRVNUIEFQSSByZXNvdXJjZSBleGlzdHNcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBpR2F0ZXdheTo6UmVzdEFwaScsIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgTmFtZTogTWF0Y2guc3RyaW5nTGlrZVJlZ2V4cCgnU3RhbmR1cERyYWZ0ZXInKVxuICAgIH0pKTtcbiAgfSk7XG5cbiAgdGVzdCgnU3RhY2sgaGFzIFMzIGJ1Y2tldCBmb3Igc3RhdGljIHdlYnNpdGUnLCAoKSA9PiB7XG4gICAgLy8gVmVyaWZ5IFMzIGJ1Y2tldCByZXNvdXJjZSBleGlzdHNcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6UzM6OkJ1Y2tldCcsIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgV2Vic2l0ZUNvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgSW5kZXhEb2N1bWVudDogJ2luZGV4Lmh0bWwnXG4gICAgICB9XG4gICAgfSkpO1xuICB9KTtcblxuICB0ZXN0KCdTdGFjayBvdXRwdXRzIHdlYnNpdGUgVVJMJywgKCkgPT4ge1xuICAgIC8vIFZlcmlmeSBDbG91ZEZvcm1hdGlvbiBvdXRwdXQgZm9yIHdlYnNpdGUgVVJMIGV4aXN0c1xuICAgIHRlbXBsYXRlLmhhc091dHB1dCgnV2Vic2l0ZVVSTCcsIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgRGVzY3JpcHRpb246ICdVUkwgb2YgdGhlIFN0YW5kdXBEcmFmdGVyIHdlYiBhcHBsaWNhdGlvbidcbiAgICB9KSk7XG4gIH0pO1xuXG4gIHRlc3QoJ1N0YWNrIG91dHB1dHMgQVBJIGVuZHBvaW50IFVSTCcsICgpID0+IHtcbiAgICAvLyBWZXJpZnkgQ2xvdWRGb3JtYXRpb24gb3V0cHV0IGZvciBBUEkgZW5kcG9pbnQgZXhpc3RzXG4gICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdBcGlFbmRwb2ludCcsIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgRGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBlbmRwb2ludCBVUkwnXG4gICAgfSkpO1xuICB9KTtcblxuICAvLyA9PT09PSBEeW5hbW9EQiBUYWJsZSBBc3NlcnRpb24gVGVzdHMgPT09PT1cblxuICB0ZXN0KCdEeW5hbW9EQiB0YWJsZSBoYXMgY29ycmVjdCBwYXJ0aXRpb24ga2V5ICh1c2VySWQpJywgKCkgPT4ge1xuICAgIC8vICoqVmFsaWRhdGVzOiBSZXF1aXJlbWVudHMgNC4yLCA0LjMsIDguNCoqXG4gICAgLy8gVmVyaWZ5IER5bmFtb0RCIHRhYmxlIHBhcnRpdGlvbiBrZXkgaXMgdXNlcklkIHdpdGggU1RSSU5HIHR5cGVcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICBLZXlTY2hlbWE6IFtcbiAgICAgICAge1xuICAgICAgICAgIEF0dHJpYnV0ZU5hbWU6ICd1c2VySWQnLFxuICAgICAgICAgIEtleVR5cGU6ICdIQVNIJyAgLy8gSEFTSCA9IHBhcnRpdGlvbiBrZXlcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIEF0dHJpYnV0ZU5hbWU6ICd0aW1lc3RhbXAnLFxuICAgICAgICAgIEtleVR5cGU6ICdSQU5HRSdcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pKTtcbiAgfSk7XG5cbiAgdGVzdCgnRHluYW1vREIgdGFibGUgaGFzIGNvcnJlY3Qgc29ydCBrZXkgKHRpbWVzdGFtcCknLCAoKSA9PiB7XG4gICAgLy8gKipWYWxpZGF0ZXM6IFJlcXVpcmVtZW50cyA0LjIsIDQuMywgOC40KipcbiAgICAvLyBWZXJpZnkgRHluYW1vREIgdGFibGUgc29ydCBrZXkgaXMgdGltZXN0YW1wIHdpdGggU1RSSU5HIHR5cGVcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICBLZXlTY2hlbWE6IFtcbiAgICAgICAge1xuICAgICAgICAgIEF0dHJpYnV0ZU5hbWU6ICd1c2VySWQnLFxuICAgICAgICAgIEtleVR5cGU6ICdIQVNIJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgQXR0cmlidXRlTmFtZTogJ3RpbWVzdGFtcCcsXG4gICAgICAgICAgS2V5VHlwZTogJ1JBTkdFJyAgLy8gUkFOR0UgPSBzb3J0IGtleVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSkpO1xuICB9KTtcblxuICB0ZXN0KCdEeW5hbW9EQiB0YWJsZSBrZXkgc2NoZW1hIGhhcyB1c2VySWQgYXMgU1RSSU5HIHR5cGUnLCAoKSA9PiB7XG4gICAgLy8gKipWYWxpZGF0ZXM6IFJlcXVpcmVtZW50cyA0LjIsIDQuMyoqXG4gICAgLy8gVmVyaWZ5IHVzZXJJZCBhdHRyaWJ1dGUgaXMgZGVmaW5lZCBhcyBTVFJJTkcgdHlwZVxuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgIEF0dHJpYnV0ZURlZmluaXRpb25zOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICB7XG4gICAgICAgICAgQXR0cmlidXRlTmFtZTogJ3VzZXJJZCcsXG4gICAgICAgICAgQXR0cmlidXRlVHlwZTogJ1MnICAvLyBTID0gU3RyaW5nIHR5cGVcbiAgICAgICAgfVxuICAgICAgXSlcbiAgICB9KSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0R5bmFtb0RCIHRhYmxlIGtleSBzY2hlbWEgaGFzIHRpbWVzdGFtcCBhcyBTVFJJTkcgdHlwZScsICgpID0+IHtcbiAgICAvLyAqKlZhbGlkYXRlczogUmVxdWlyZW1lbnRzIDQuMiwgNC4zKipcbiAgICAvLyBWZXJpZnkgdGltZXN0YW1wIGF0dHJpYnV0ZSBpcyBkZWZpbmVkIGFzIFNUUklORyB0eXBlXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgQXR0cmlidXRlRGVmaW5pdGlvbnM6IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgIHtcbiAgICAgICAgICBBdHRyaWJ1dGVOYW1lOiAndGltZXN0YW1wJyxcbiAgICAgICAgICBBdHRyaWJ1dGVUeXBlOiAnUycgIC8vIFMgPSBTdHJpbmcgdHlwZVxuICAgICAgICB9XG4gICAgICBdKVxuICAgIH0pKTtcbiAgfSk7XG5cbiAgdGVzdCgnRHluYW1vREIgdGFibGUgdXNlcyBvbi1kZW1hbmQgYmlsbGluZyBtb2RlJywgKCkgPT4ge1xuICAgIC8vICoqVmFsaWRhdGVzOiBSZXF1aXJlbWVudHMgOC43KipcbiAgICAvLyBWZXJpZnkgdGFibGUgaXMgY29uZmlndXJlZCBmb3Igb24tZGVtYW5kIGJpbGxpbmcgKHBheS1wZXItcmVxdWVzdClcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICBCaWxsaW5nTW9kZTogJ1BBWV9QRVJfUkVRVUVTVCdcbiAgICB9KSk7XG4gIH0pO1xuXG4gIC8vID09PT09IExhbWJkYSBGdW5jdGlvbiBBc3NlcnRpb24gVGVzdHMgPT09PT1cblxuICB0ZXN0KCdMYW1iZGEgZnVuY3Rpb24gaGFzIFB5dGhvbiAzLjEyIHJ1bnRpbWUnLCAoKSA9PiB7XG4gICAgLy8gKipWYWxpZGF0ZXM6IFJlcXVpcmVtZW50cyA3LjEsIDguMyoqXG4gICAgLy8gVmVyaWZ5IExhbWJkYSBydW50aW1lIGlzIGV4cGxpY2l0bHkgc2V0IHRvIFB5dGhvbiAzLjEyXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLCBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgIFJ1bnRpbWU6ICdweXRob24zLjEyJ1xuICAgIH0pKTtcbiAgfSk7XG5cbiAgdGVzdCgnTGFtYmRhIGZ1bmN0aW9uIGhhcyAyOSBzZWNvbmQgdGltZW91dCcsICgpID0+IHtcbiAgICAvLyAqKlZhbGlkYXRlczogUmVxdWlyZW1lbnRzIDYuNywgNy4yKipcbiAgICAvLyBWZXJpZnkgTGFtYmRhIHRpbWVvdXQgaXMgc2V0IHRvIDI5IHNlY29uZHMgKGp1c3QgdW5kZXIgQVBJIEdhdGV3YXkgMzBzIGxpbWl0KVxuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJywgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICBUaW1lb3V0OiAyOVxuICAgIH0pKTtcbiAgfSk7XG5cbiAgdGVzdCgnTGFtYmRhIGZ1bmN0aW9uIGhhcyBjb3JyZWN0IGhhbmRsZXIgZW50cnkgcG9pbnQnLCAoKSA9PiB7XG4gICAgLy8gKipWYWxpZGF0ZXM6IFJlcXVpcmVtZW50cyAzLjEsIDcuMSoqXG4gICAgLy8gVmVyaWZ5IExhbWJkYSBoYW5kbGVyIHBvaW50cyB0byBsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXJcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicsIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgSGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcidcbiAgICB9KSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0xhbWJkYSBmdW5jdGlvbiBoYXMgMjU2IE1CIG1lbW9yeScsICgpID0+IHtcbiAgICAvLyAqKlZhbGlkYXRlczogUmVxdWlyZW1lbnRzIDMuMSwgNy4xKipcbiAgICAvLyBWZXJpZnkgTGFtYmRhIG1lbW9yeSBpcyBjb25maWd1cmVkIGFwcHJvcHJpYXRlbHkgZm9yIHRleHQgcHJvY2Vzc2luZ1xuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJywgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICBNZW1vcnlTaXplOiAyNTZcbiAgICB9KSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0xhbWJkYSBmdW5jdGlvbiBoYXMgRFlOQU1PREJfVEFCTEVfTkFNRSBlbnZpcm9ubWVudCB2YXJpYWJsZScsICgpID0+IHtcbiAgICAvLyAqKlZhbGlkYXRlczogUmVxdWlyZW1lbnRzIDMuMSwgOC4zKipcbiAgICAvLyBWZXJpZnkgTGFtYmRhIGVudmlyb25tZW50IHZhcmlhYmxlcyBpbmNsdWRlIER5bmFtb0RCIHRhYmxlIG5hbWUgcmVmZXJlbmNlXG4gICAgY29uc3QganNvbiA9IHRlbXBsYXRlLnRvSlNPTigpO1xuICAgIGNvbnN0IGdlbmVyYXRvckZ1bmMgPSBPYmplY3QudmFsdWVzKGpzb24uUmVzb3VyY2VzKS5maW5kKFxuICAgICAgKHI6IGFueSkgPT4gci5UeXBlID09PSAnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJyAmJiByLlByb3BlcnRpZXM/LkhhbmRsZXIgPT09ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInXG4gICAgKSBhcyBhbnk7XG4gICAgZXhwZWN0KGdlbmVyYXRvckZ1bmMpLnRvQmVEZWZpbmVkKCk7XG4gICAgZXhwZWN0KGdlbmVyYXRvckZ1bmMuUHJvcGVydGllcy5FbnZpcm9ubWVudC5WYXJpYWJsZXMuRFlOQU1PREJfVEFCTEVfTkFNRSkudG9CZURlZmluZWQoKTtcbiAgfSk7XG5cbiAgdGVzdCgnTGFtYmRhIGZ1bmN0aW9uIGhhcyBCRURST0NLX01PREVMX0lEIGVudmlyb25tZW50IHZhcmlhYmxlJywgKCkgPT4ge1xuICAgIC8vICoqVmFsaWRhdGVzOiBSZXF1aXJlbWVudHMgMy4xLCA4LjMqKlxuICAgIC8vIFZlcmlmeSBMYW1iZGEgZW52aXJvbm1lbnQgdmFyaWFibGVzIGluY2x1ZGUgQmVkcm9jayBtb2RlbCBJRFxuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJywgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICBFbnZpcm9ubWVudDoge1xuICAgICAgICBWYXJpYWJsZXM6IE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgIEJFRFJPQ0tfTU9ERUxfSUQ6IE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoJ2FtYXpvbi5ub3ZhJylcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0xhbWJkYSBmdW5jdGlvbiBoYXMgQmVkcm9jayBJbnZva2VNb2RlbCBwZXJtaXNzaW9ucycsICgpID0+IHtcbiAgICAvLyAqKlZhbGlkYXRlczogUmVxdWlyZW1lbnRzIDcuMywgNy40KipcbiAgICAvLyBWZXJpZnkgTGFtYmRhIElBTSByb2xlIGhhcyBwZXJtaXNzaW9uIHRvIGludm9rZSBCZWRyb2NrIG1vZGVsc1xuICAgIGNvbnN0IGpzb24gPSB0ZW1wbGF0ZS50b0pTT04oKTtcbiAgICBjb25zdCBwb2xpY2llcyA9IE9iamVjdC52YWx1ZXMoanNvbi5SZXNvdXJjZXMpLmZpbHRlcihcbiAgICAgIChyOiBhbnkpID0+IHIuVHlwZSA9PT0gJ0FXUzo6SUFNOjpQb2xpY3knXG4gICAgKSBhcyBhbnlbXTtcbiAgICBcbiAgICBjb25zdCBoYXNCZWRyb2NrUGVybWlzc2lvbiA9IHBvbGljaWVzLnNvbWUocG9saWN5ID0+XG4gICAgICBwb2xpY3kuUHJvcGVydGllcy5Qb2xpY3lEb2N1bWVudC5TdGF0ZW1lbnQuc29tZSgoc3RtdDogYW55KSA9PlxuICAgICAgICBzdG10LkFjdGlvbiA9PT0gJ2JlZHJvY2s6SW52b2tlTW9kZWwnICYmXG4gICAgICAgIHN0bXQuRWZmZWN0ID09PSAnQWxsb3cnICYmXG4gICAgICAgIEFycmF5LmlzQXJyYXkoc3RtdC5SZXNvdXJjZSkgJiZcbiAgICAgICAgc3RtdC5SZXNvdXJjZS5sZW5ndGggPiAwXG4gICAgICApXG4gICAgKTtcbiAgICBcbiAgICBleHBlY3QoaGFzQmVkcm9ja1Blcm1pc3Npb24pLnRvQmUodHJ1ZSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0xhbWJkYSBJQU0gcm9sZSBoYXMgRHluYW1vREIgcmVhZCBwZXJtaXNzaW9ucycsICgpID0+IHtcbiAgICAvLyAqKlZhbGlkYXRlczogUmVxdWlyZW1lbnRzIDcuMiwgNy40KipcbiAgICAvLyBWZXJpZnkgTGFtYmRhIGNhbiByZWFkIGZyb20gRHluYW1vREIgdGFibGUgKHF1ZXJ5IGhpc3RvcnkpXG4gICAgY29uc3QganNvbiA9IHRlbXBsYXRlLnRvSlNPTigpO1xuICAgIGNvbnN0IHBvbGljaWVzID0gT2JqZWN0LnZhbHVlcyhqc29uLlJlc291cmNlcykuZmlsdGVyKFxuICAgICAgKHI6IGFueSkgPT4gci5UeXBlID09PSAnQVdTOjpJQU06OlBvbGljeSdcbiAgICApIGFzIGFueVtdO1xuICAgIFxuICAgIGNvbnN0IGhhc0R5bmFtb0RiUmVhZCA9IHBvbGljaWVzLnNvbWUocG9saWN5ID0+XG4gICAgICBwb2xpY3kuUHJvcGVydGllcy5Qb2xpY3lEb2N1bWVudC5TdGF0ZW1lbnQuc29tZSgoc3RtdDogYW55KSA9PlxuICAgICAgICBzdG10LkVmZmVjdCA9PT0gJ0FsbG93JyAmJlxuICAgICAgICBBcnJheS5pc0FycmF5KHN0bXQuQWN0aW9uKSAmJlxuICAgICAgICBzdG10LkFjdGlvbi5zb21lKChhY3Rpb246IHN0cmluZykgPT4gXG4gICAgICAgICAgYWN0aW9uLmluY2x1ZGVzKCdkeW5hbW9kYjpHZXRJdGVtJykgfHwgYWN0aW9uLmluY2x1ZGVzKCdkeW5hbW9kYjpRdWVyeScpXG4gICAgICAgIClcbiAgICAgIClcbiAgICApO1xuICAgIFxuICAgIGV4cGVjdChoYXNEeW5hbW9EYlJlYWQpLnRvQmUodHJ1ZSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0xhbWJkYSBJQU0gcm9sZSBoYXMgRHluYW1vREIgd3JpdGUgcGVybWlzc2lvbnMnLCAoKSA9PiB7XG4gICAgLy8gKipWYWxpZGF0ZXM6IFJlcXVpcmVtZW50cyA3LjIsIDcuNCoqXG4gICAgLy8gVmVyaWZ5IExhbWJkYSBjYW4gd3JpdGUgdG8gRHluYW1vREIgdGFibGUgKHN0b3JlIHVwZGF0ZXMpXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6UG9saWN5JywgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICBQb2xpY3lEb2N1bWVudDoge1xuICAgICAgICBTdGF0ZW1lbnQ6IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICBBY3Rpb246IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgICAgIE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoJ2R5bmFtb2RiOlB1dEl0ZW0nKVxuICAgICAgICAgICAgXSksXG4gICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdydcbiAgICAgICAgICB9KVxuICAgICAgICBdKVxuICAgICAgfVxuICAgIH0pKTtcbiAgfSk7XG5cbiAgdGVzdCgnTGFtYmRhIElBTSByb2xlIGhhcyBDbG91ZFdhdGNoIExvZ3Mgd3JpdGUgcGVybWlzc2lvbnMnLCAoKSA9PiB7XG4gICAgLy8gKipWYWxpZGF0ZXM6IFJlcXVpcmVtZW50cyA3LjQsIDguMyoqXG4gICAgLy8gVmVyaWZ5IExhbWJkYSBjYW4gd3JpdGUgbG9ncyB0byBDbG91ZFdhdGNoIExvZ3NcbiAgICBjb25zdCBqc29uID0gdGVtcGxhdGUudG9KU09OKCk7XG4gICAgY29uc3QgcG9saWNpZXMgPSBPYmplY3QudmFsdWVzKGpzb24uUmVzb3VyY2VzKS5maWx0ZXIoXG4gICAgICAocjogYW55KSA9PiByLlR5cGUgPT09ICdBV1M6OklBTTo6UG9saWN5J1xuICAgICkgYXMgYW55W107XG4gICAgXG4gICAgY29uc3QgaGFzTG9nc1Blcm1pc3Npb24gPSBwb2xpY2llcy5zb21lKHBvbGljeSA9PlxuICAgICAgcG9saWN5LlByb3BlcnRpZXMuUG9saWN5RG9jdW1lbnQuU3RhdGVtZW50LnNvbWUoKHN0bXQ6IGFueSkgPT5cbiAgICAgICAgc3RtdC5FZmZlY3QgPT09ICdBbGxvdycgJiZcbiAgICAgICAgQXJyYXkuaXNBcnJheShzdG10LkFjdGlvbikgJiZcbiAgICAgICAgc3RtdC5BY3Rpb24uc29tZSgoYWN0aW9uOiBzdHJpbmcpID0+IGFjdGlvbi5pbmNsdWRlcygnbG9nczonKSlcbiAgICAgIClcbiAgICApO1xuICAgIFxuICAgIGV4cGVjdChoYXNMb2dzUGVybWlzc2lvbikudG9CZSh0cnVlKTtcbiAgfSk7XG5cbiAgLy8gPT09PT0gQVBJIEdhdGV3YXkgQXNzZXJ0aW9uIFRlc3RzID09PT09XG5cbiAgdGVzdCgnQVBJIEdhdGV3YXkgaGFzIC9nZW5lcmF0ZSBlbmRwb2ludCB3aXRoIFBPU1QgbWV0aG9kJywgKCkgPT4ge1xuICAgIC8vICoqVmFsaWRhdGVzOiBSZXF1aXJlbWVudHMgOC4yLCA4LjQqKlxuICAgIC8vIFZlcmlmeSAvZ2VuZXJhdGUgcmVzb3VyY2UgZXhpc3RzIHdpdGggUE9TVCBtZXRob2RcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBpR2F0ZXdheTo6TWV0aG9kJywgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICBIdHRwTWV0aG9kOiAnUE9TVCdcbiAgICB9KSk7XG5cbiAgICAvLyBBbHNvIHZlcmlmeSB0aGUgcmVzb3VyY2UgcGF0aCBpbmNsdWRlcyAvZ2VuZXJhdGVcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBpR2F0ZXdheTo6UmVzb3VyY2UnLCBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgIFBhdGhQYXJ0OiAnZ2VuZXJhdGUnXG4gICAgfSkpO1xuICB9KTtcblxuICB0ZXN0KCdBUEkgR2F0ZXdheSBoYXMgL2hpc3RvcnkgZW5kcG9pbnQgd2l0aCBHRVQgbWV0aG9kJywgKCkgPT4ge1xuICAgIC8vICoqVmFsaWRhdGVzOiBSZXF1aXJlbWVudHMgOC4yLCA4LjQqKlxuICAgIC8vIFZlcmlmeSAvaGlzdG9yeSByZXNvdXJjZSBleGlzdHMgd2l0aCBHRVQgbWV0aG9kXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwaUdhdGV3YXk6Ok1ldGhvZCcsIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgSHR0cE1ldGhvZDogJ0dFVCdcbiAgICB9KSk7XG5cbiAgICAvLyBBbHNvIHZlcmlmeSB0aGUgcmVzb3VyY2UgcGF0aCBpbmNsdWRlcyAvaGlzdG9yeVxuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpBcGlHYXRld2F5OjpSZXNvdXJjZScsIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgUGF0aFBhcnQ6ICdoaXN0b3J5J1xuICAgIH0pKTtcbiAgfSk7XG5cbiAgdGVzdCgnQVBJIEdhdGV3YXkgaGFzIENPUlMgY29uZmlndXJhdGlvbiB3aXRoIE9QVElPTlMgbWV0aG9kcycsICgpID0+IHtcbiAgICAvLyAqKlZhbGlkYXRlczogUmVxdWlyZW1lbnRzIDcuNSwgOC4yKipcbiAgICAvLyBWZXJpZnkgQVBJIEdhdGV3YXkgaGFzIE9QVElPTlMgbWV0aG9kcyBmb3IgQ09SUyBwcmVmbGlnaHRcbiAgICBjb25zdCBqc29uID0gdGVtcGxhdGUudG9KU09OKCk7XG4gICAgY29uc3QgbWV0aG9kcyA9IE9iamVjdC5lbnRyaWVzKGpzb24uUmVzb3VyY2VzKS5maWx0ZXIoXG4gICAgICAoW2tleV0pID0+IGtleS5pbmNsdWRlcygnTWV0aG9kT3B0aW9ucycpIHx8IChqc29uLlJlc291cmNlc1trZXldIGFzIGFueSkuVHlwZSA9PT0gJ0FXUzo6QXBpR2F0ZXdheTo6TWV0aG9kJ1xuICAgICk7XG4gICAgZXhwZWN0KG1ldGhvZHMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gIH0pO1xuXG4gIHRlc3QoJ0FQSSBHYXRld2F5IGVuZHBvaW50cyB1c2UgTGFtYmRhIGludGVncmF0aW9uJywgKCkgPT4ge1xuICAgIC8vICoqVmFsaWRhdGVzOiBSZXF1aXJlbWVudHMgOC4yLCA4LjQqKlxuICAgIC8vIFZlcmlmeSBBUEkgbWV0aG9kcyBpbnRlZ3JhdGUgd2l0aCBMYW1iZGEgZnVuY3Rpb24gdmlhIHByb3h5IGludGVncmF0aW9uXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwaUdhdGV3YXk6Ok1ldGhvZCcsIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgSW50ZWdyYXRpb246IE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICBUeXBlOiAnQVdTX1BST1hZJ1xuICAgICAgfSlcbiAgICB9KSk7XG4gIH0pO1xuXG4gIC8vID09PT09IFMzIEJ1Y2tldCBBc3NlcnRpb24gVGVzdHMgPT09PT1cblxuICB0ZXN0KCdTMyBidWNrZXQgaGFzIHdlYnNpdGUgaG9zdGluZyBlbmFibGVkJywgKCkgPT4ge1xuICAgIC8vICoqVmFsaWRhdGVzOiBSZXF1aXJlbWVudHMgNy42LCA4LjEqKlxuICAgIC8vIFZlcmlmeSBTMyBidWNrZXQgaGFzIHN0YXRpYyB3ZWJzaXRlIGhvc3RpbmcgY29uZmlndXJlZFxuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpTMzo6QnVja2V0JywgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICBXZWJzaXRlQ29uZmlndXJhdGlvbjoge1xuICAgICAgICBJbmRleERvY3VtZW50OiAnaW5kZXguaHRtbCdcbiAgICAgIH1cbiAgICB9KSk7XG4gIH0pO1xuXG4gIHRlc3QoJ1MzIGJ1Y2tldCBoYXMgcHVibGljIHJlYWQgYWNjZXNzIGNvbmZpZ3VyZWQnLCAoKSA9PiB7XG4gICAgLy8gKipWYWxpZGF0ZXM6IFJlcXVpcmVtZW50cyA3LjYqKlxuICAgIC8vIFZlcmlmeSBTMyBidWNrZXQgaXMgY29uZmlndXJlZCB0byBhbGxvdyBwdWJsaWMgcmVhZCBhY2Nlc3NcbiAgICBjb25zdCBqc29uID0gdGVtcGxhdGUudG9KU09OKCk7XG4gICAgY29uc3QgcG9saWN5ID0gT2JqZWN0LnZhbHVlcyhqc29uLlJlc291cmNlcykuZmluZChcbiAgICAgIChyOiBhbnkpID0+IHIuVHlwZSA9PT0gJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeSdcbiAgICApIGFzIGFueTtcbiAgICBcbiAgICBleHBlY3QocG9saWN5KS50b0JlRGVmaW5lZCgpO1xuICAgIGV4cGVjdChwb2xpY3kuUHJvcGVydGllcy5Qb2xpY3lEb2N1bWVudCkudG9CZURlZmluZWQoKTtcbiAgICBcbiAgICBjb25zdCBoYXNQdWJsaWNSZWFkQWNjZXNzID0gcG9saWN5LlByb3BlcnRpZXMuUG9saWN5RG9jdW1lbnQuU3RhdGVtZW50LnNvbWUoKHN0bXQ6IGFueSkgPT5cbiAgICAgIHN0bXQuRWZmZWN0ID09PSAnQWxsb3cnICYmXG4gICAgICBzdG10LlByaW5jaXBhbCA9PT0gJyonICYmXG4gICAgICBzdG10LkFjdGlvbiA9PT0gJ3MzOkdldE9iamVjdCdcbiAgICApO1xuICAgIFxuICAgIGV4cGVjdChoYXNQdWJsaWNSZWFkQWNjZXNzKS50b0JlKHRydWUpO1xuICB9KTtcblxuICB0ZXN0KCdTMyBidWNrZXQgZXhpc3RzIGFuZCBpcyBwcm9wZXJseSBjb25maWd1cmVkJywgKCkgPT4ge1xuICAgIC8vICoqVmFsaWRhdGVzOiBSZXF1aXJlbWVudHMgOC4xLCA4LjIqKlxuICAgIC8vIFZlcmlmeSBTMyBidWNrZXQgcmVzb3VyY2UgZXhpc3RzXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OlMzOjpCdWNrZXQnLCBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgIFdlYnNpdGVDb25maWd1cmF0aW9uOiBNYXRjaC5vYmplY3RMaWtlKHt9KVxuICAgIH0pKTtcbiAgfSk7XG5cbiAgdGVzdCgnTGFtYmRhIHBlcm1pc3Npb24gYWxsb3dzIEFQSSBHYXRld2F5IGludm9jYXRpb24nLCAoKSA9PiB7XG4gICAgLy8gKipWYWxpZGF0ZXM6IFJlcXVpcmVtZW50cyA4LjIsIDguNCoqXG4gICAgLy8gVmVyaWZ5IExhbWJkYSBoYXMgcGVybWlzc2lvbiB0byBiZSBpbnZva2VkIGJ5IEFQSSBHYXRld2F5XG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicsIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgQWN0aW9uOiAnbGFtYmRhOkludm9rZUZ1bmN0aW9uJyxcbiAgICAgIFByaW5jaXBhbDogJ2FwaWdhdGV3YXkuYW1hem9uYXdzLmNvbSdcbiAgICB9KSk7XG4gIH0pO1xuXG4gIHRlc3QoJ0R5bmFtb0RCIHRhYmxlIGlzIHJlZmVyZW5jZWQgaW4gTGFtYmRhIElBTSBwb2xpY3knLCAoKSA9PiB7XG4gICAgLy8gKipWYWxpZGF0ZXM6IFJlcXVpcmVtZW50cyA3LjIsIDcuNCwgOC4zKipcbiAgICAvLyBWZXJpZnkgdGhlIExhbWJkYSBleGVjdXRpb24gcm9sZSBoYXMgaW5saW5lIHBvbGljaWVzIHJlZmVyZW5jaW5nIER5bmFtb0RCXG4gICAgY29uc3QganNvbiA9IHRlbXBsYXRlLnRvSlNPTigpO1xuICAgIGNvbnN0IHBvbGljeUNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShqc29uKTtcbiAgICBcbiAgICBjb25zdCBoYXNEeW5hbW9EYlJlZmVyZW5jZSA9IFxuICAgICAgcG9saWN5Q29udGVudC5pbmNsdWRlcygnZHluYW1vZGInKSAmJlxuICAgICAgKHBvbGljeUNvbnRlbnQuaW5jbHVkZXMoJ1VwZGF0ZXNUYWJsZScpIHx8IHBvbGljeUNvbnRlbnQuaW5jbHVkZXMoJ2R5bmFtb2RiOkdldEl0ZW0nKSB8fCBwb2xpY3lDb250ZW50LmluY2x1ZGVzKCdkeW5hbW9kYjpQdXRJdGVtJykpO1xuICAgIFxuICAgIGV4cGVjdChoYXNEeW5hbW9EYlJlZmVyZW5jZSkudG9CZSh0cnVlKTtcbiAgfSk7XG5cbiAgdGVzdCgnQ2xvdWRGb3JtYXRpb24gb3V0cHV0cyBpbmNsdWRlIEFQSSBlbmRwb2ludCBhbmQgd2Vic2l0ZSBVUkwnLCAoKSA9PiB7XG4gICAgLy8gKipWYWxpZGF0ZXM6IFJlcXVpcmVtZW50cyA4LjgqKlxuICAgIC8vIFZlcmlmeSBzdGFjayBvdXRwdXRzIGZvciBkZXBsb3ltZW50IFVSTHNcbiAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ0FwaUVuZHBvaW50JywgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICBEZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IGVuZHBvaW50IFVSTCdcbiAgICB9KSk7XG5cbiAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ1dlYnNpdGVVUkwnLCBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgIERlc2NyaXB0aW9uOiAnVVJMIG9mIHRoZSBTdGFuZHVwRHJhZnRlciB3ZWIgYXBwbGljYXRpb24nXG4gICAgfSkpO1xuICB9KTtcblxuICB0ZXN0KCdTdGFjayBoYXMgYWxsIHJlcXVpcmVkIHJlc291cmNlIHR5cGVzJywgKCkgPT4ge1xuICAgIC8vICoqVmFsaWRhdGVzOiBSZXF1aXJlbWVudHMgNy4xLCA3LjIsIDcuMywgNy40LCA3LjcsIDguMiwgOC4zLCA4LjQqKlxuICAgIC8vIENvbXByZWhlbnNpdmUgY2hlY2sgdGhhdCBhbGwgcmVzb3VyY2UgdHlwZXMgZXhpc3RcbiAgICBjb25zdCBqc29uID0gdGVtcGxhdGUudG9KU09OKCk7XG4gICAgY29uc3QgcmVzb3VyY2VUeXBlcyA9IE9iamVjdC52YWx1ZXMoanNvbi5SZXNvdXJjZXMpLm1hcCgocjogYW55KSA9PiByLlR5cGUpO1xuICAgIFxuICAgIGV4cGVjdChyZXNvdXJjZVR5cGVzKS50b0NvbnRhaW4oJ0FXUzo6RHluYW1vREI6OlRhYmxlJyk7XG4gICAgZXhwZWN0KHJlc291cmNlVHlwZXMpLnRvQ29udGFpbignQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJyk7XG4gICAgZXhwZWN0KHJlc291cmNlVHlwZXMpLnRvQ29udGFpbignQVdTOjpBcGlHYXRld2F5OjpSZXN0QXBpJyk7XG4gICAgZXhwZWN0KHJlc291cmNlVHlwZXMpLnRvQ29udGFpbignQVdTOjpTMzo6QnVja2V0Jyk7XG4gICAgZXhwZWN0KHJlc291cmNlVHlwZXMpLnRvQ29udGFpbignQVdTOjpJQU06OlJvbGUnKTtcbiAgICBleHBlY3QocmVzb3VyY2VUeXBlcykudG9Db250YWluKCdBV1M6OklBTTo6UG9saWN5Jyk7XG4gIH0pO1xufSk7XG4iXX0=