# StandupDrafter

Transform informal work notes into professional status updates using AWS and AI.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [AWS Credentials Configuration](#aws-credentials-configuration)
- [Deployment Instructions](#deployment-instructions)
- [Accessing the Application](#accessing-the-application)
- [End-to-End User Flow](#end-to-end-user-flow)
- [AWS Free Tier & Cost Considerations](#aws-free-tier--cost-considerations)
- [Cleanup Instructions](#cleanup-instructions)
- [Project Structure](#project-structure)
- [Development](#development)

## Architecture Overview

StandupDrafter is a fully serverless web application that transforms rough work notes into professional status updates using Amazon Bedrock AI. The system is designed to be cost-effective and easy to deploy.

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│        Amazon S3 - Static Website Hosting                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Frontend: HTML / CSS / JavaScript (Vanilla)              │ │
│  │ - Input textarea for work notes                          │ │
│  │ - Output display for generated updates                   │ │
│  │ - History list of previous updates                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────────┘
                      │ REST API calls
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│           Amazon API Gateway - REST API                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ POST /generate - Generate status update                  │ │
│  │ GET /history   - Retrieve update history                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌──────────────────┐     ┌──────────────────────────────────┐
│ AWS Lambda       │     │ Amazon Bedrock                   │
│ (Python 3.12)    │────▶│ (Nova Micro/Lite Model)          │
│ ┌──────────────┐ │     │ - AI-powered text generation     │
│ │ - Orchestrate│ │     │ - Formats notes into sections    │
│ │ - Invoke AI  │ │     │ - Done/In Progress/Blockers      │
│ │ - Store data │ │     │                                  │
│ └──────────────┘ │     └──────────────────────────────────┘
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│        Amazon DynamoDB - NoSQL Database                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Table: StandupUpdates                                     │ │
│  │ Partition Key: userId | Sort Key: timestamp              │ │
│  │ - Stores generated updates with original notes            │ │
│  │ - On-demand billing (Free Tier eligible)                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Component Overview

- **Frontend (S3)**: Single-page application with input area, output display, and history
- **API Gateway**: REST endpoints for generating updates and retrieving history
- **Lambda Function**: Orchestrates AI invocation, error handling, and data storage
- **Amazon Bedrock**: AI service that transforms notes into professional updates
- **DynamoDB**: Stores all generated updates and original notes for history

## Prerequisites

Before you begin, ensure you have the following installed and configured:

### Required Software

1. **AWS Account**: An active AWS account with appropriate permissions
   - Free Tier eligible for this project (see [Cost Considerations](#aws-free-tier--cost-considerations))

2. **AWS CLI v2**: Command-line interface for AWS services
   - [Installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
   - Verify: `aws --version`

3. **Node.js 18+**: JavaScript runtime and package manager
   - [Download from nodejs.org](https://nodejs.org/)
   - Verify: `node --version` and `npm --version`

4. **AWS CDK 2.x**: Cloud Development Kit for infrastructure as code
   - Install globally: `npm install -g aws-cdk`
   - Verify: `cdk --version`

5. **Python 3.12+**: Required for Lambda function runtime
   - [Download from python.org](https://www.python.org/downloads/)
   - Verify: `python3 --version`

### Verify All Prerequisites

Run this command to check all requirements are met:

```bash
echo "AWS CLI:" && aws --version
echo "Node.js:" && node --version
echo "npm:" && npm --version
echo "CDK:" && cdk --version
echo "Python:" && python3 --version
```

## AWS Credentials Configuration

### Step 1: Create AWS Access Keys

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/)
2. Navigate to **IAM** (Identity and Access Management)
3. Click **Users** in the left sidebar
4. Select your user (or create a new one with programmatic access)
5. Go to the **Security Credentials** tab
6. Click **Create access key**
7. Choose **Command Line Interface (CLI)**
8. Click **Next**, then **Create access key**
9. **Important**: Save the Access Key ID and Secret Access Key securely

### Step 2: Configure AWS CLI

Run the following command to configure your credentials:

```bash
aws configure
```

You will be prompted for:
- **AWS Access Key ID**: Paste the Access Key ID from Step 1
- **AWS Secret Access Key**: Paste the Secret Access Key from Step 1
- **Default region name**: Enter `us-east-1` (or your preferred region)
- **Default output format**: Enter `json`

### Step 3: Verify Configuration

Test your credentials:

```bash
aws sts get-caller-identity
```

You should see output displaying your AWS account information. If successful, your credentials are configured correctly.

### Alternative: Using AWS Profile

If you have multiple AWS accounts, you can create named profiles:

```bash
aws configure --profile standup-drafter
```

Then use this profile when deploying:

```bash
cdk deploy --profile standup-drafter
```

## Deployment Instructions

### Step 1: Clone/Download the Project

If you haven't already, navigate to your project directory:

```bash
cd StandupDrafter
```

### Step 2: Install Dependencies

Install all Node.js dependencies:

```bash
npm install
```

### Step 3: Bootstrap CDK (First Time Only)

If this is your first time using CDK in your AWS account/region, bootstrap the environment:

```bash
cdk bootstrap
```

This creates an S3 bucket and IAM roles needed for CDK deployments. You only need to run this once per AWS account/region combination.

### Step 4: Build TypeScript Code

Compile the TypeScript CDK code:

```bash
npm run build
```

Or use watch mode for development:

```bash
npm run watch
```

### Step 5: Review Deployment

Before deploying, you can review the CloudFormation template:

```bash
cdk synth
```

This generates the CloudFormation template without deploying.

### Step 6: Deploy to AWS

Deploy all resources to AWS:

```bash
cdk deploy
```

The command will:
- Show you a summary of resources to be created
- Prompt for confirmation (type `y` to proceed)
- Deploy all AWS resources
- Output the website URL and API endpoint URL

**Expected deployment time**: 2-5 minutes

### Full Deployment Command Example

```bash
npm install && \
npm run build && \
cdk bootstrap && \
cdk deploy --require-approval never
```

(The `--require-approval never` flag skips the confirmation prompt for CI/CD automation)

## Accessing the Application

### After Deployment

Once `cdk deploy` completes successfully, you will see output similar to:

```
✓ StandupDrafterStack

Outputs:
StandupDrafterStack.WebsiteURL = http://standup-drafter-12345.s3-website-us-east-1.amazonaws.com/
StandupDrafterStack.ApiEndpoint = https://abc123defg.execute-api.us-east-1.amazonaws.com/prod/
```

### Opening the Web Application

1. Copy the **WebsiteURL** from the output
2. Open it in your web browser
3. You should see the StandupDrafter interface with:
   - A text area to enter your work notes
   - A "Generate Update" button
   - An area for displaying generated updates
   - A history section showing past updates

### Example URL

```
http://standup-drafter-12345.s3-website-us-east-1.amazonaws.com/
```

## End-to-End User Flow

### Step-by-Step: From Notes to Display

#### 1. **User Enters Work Notes**

The user opens the StandupDrafter web application and types informal work notes:

```
Input Example:
"
- Fixed the login bug that was preventing users from resetting passwords
- Started refactoring the API to use new architecture
- Blocked on approval from security team for database migration
"
```

#### 2. **Frontend Validation**

The frontend JavaScript validates the input:
- Checks that notes are not empty
- Enables the "Generate Update" button
- Prevents submission of whitespace-only input

#### 3. **User Clicks "Generate Update"**

The frontend:
1. Shows a loading indicator
2. Sends the notes to the API Gateway endpoint via HTTPS POST request
3. Includes a unique userId (stored in browser localStorage for history)

#### 4. **API Gateway Routes Request**

API Gateway receives the POST request to `/generate` and:
1. Validates the request format
2. Routes it to the Lambda function
3. Handles CORS headers

#### 5. **Lambda Function Processes Request**

The Lambda function:
1. Parses the userId and notes from the request
2. Validates the input data
3. Constructs a prompt for the AI with specific formatting instructions
4. Invokes Amazon Bedrock with the prompt

#### 6. **Bedrock AI Generates Professional Update**

Amazon Bedrock (using Nova Micro/Lite model):
1. Receives the prompt with user notes
2. Analyzes the content
3. Generates a professionally formatted status update
4. Organizes content into three sections:
   - **Done**: Completed tasks
   - **In Progress**: Ongoing work
   - **Blockers**: Challenges or blockers

Example output:
```
**Done:**
- Fixed authentication bug in password reset flow
- Ensured proper error messages for edge cases

**In Progress:**
- Refactoring API gateway to new microservices architecture
- Integrating with updated backend service

**Blockers:**
- Awaiting security team approval for database migration
- Blocked on completion of data export requirements
```

#### 7. **Lambda Stores History**

The Lambda function:
1. Generates an ISO 8601 timestamp
2. Stores the record in DynamoDB with:
   - userId
   - timestamp
   - original notes
   - generated update
3. Continues even if storage fails (still returns update to user)

#### 8. **Response Sent to Frontend**

Lambda returns:
```json
{
  "success": true,
  "statusUpdate": "[formatted update text]",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

#### 9. **Frontend Displays Result**

The frontend:
1. Hides the loading indicator
2. Displays the formatted status update
3. Shows a "Copy to Clipboard" button
4. Updates the history list with the new entry

#### 10. **User Reviews and Copies**

The user can:
1. Review the generated update
2. Click "Copy to Clipboard" to copy text for pasting into Slack/email
3. Click on history items to view previous updates
4. Generate more updates as needed

### Data Flow Summary

```
User Input
    ↓
Frontend Validation
    ↓
HTTP POST to API Gateway
    ↓
Lambda Function
    ├→ Validate Input
    ├→ Invoke Bedrock AI
    ├→ Store in DynamoDB
    └→ Return Response
    ↓
HTTP Response from API Gateway
    ↓
Frontend Display
    ↓
User Copies and Shares
```

## AWS Free Tier & Cost Considerations

### Free Tier Eligibility

StandupDrafter is designed to stay within **AWS Free Tier limits** for 12 months:

#### Free Services (Always Free)

- **Amazon S3** (Static Website Hosting):
  - 5 GB storage
  - Your frontend files are ~50 KB
  
- **Amazon API Gateway**:
  - 1 million requests per month
  - With 1 request per update and 5 updates/day = ~150 requests/month ✓

- **AWS Lambda**:
  - 1 million requests per month
  - 3.15 million seconds of compute time per month
  - With 150 requests/month × 0.5s = 75 seconds ✓

- **Amazon DynamoDB**:
  - 25 GB storage (on-demand mode)
  - 200 million read/write units per month
  - History storage for 1000 updates = ~200 KB (well under 25 GB) ✓

- **Amazon Bedrock**:
  - No free tier, but very low cost per invocation
  - Nova Micro pricing: ~$0.075 per million input tokens, ~$0.30 per million output tokens
  - Example: 500 requests/month × 200 input tokens × 50 output tokens ≈ $0.50-$2.00/month

#### Free Tier Summary for Light Usage (5 updates/day)

| Service | Monthly Usage | Free Tier Limit | Cost |
|---------|---------------|-----------------|------|
| S3 Static Hosting | ~50 KB | 5 GB | Free |
| API Gateway | ~150 requests | 1M requests | Free |
| Lambda | ~75 seconds | 3.15M seconds | Free |
| DynamoDB | ~200 KB | 25 GB | Free |
| Bedrock (Nova Micro) | ~500 invocations | None | ~$1-3 |
| **Total Monthly** | - | - | **~$1-3** |

### Cost Optimization Features Built In

1. **On-Demand DynamoDB Billing**: Pay only for what you use
2. **Nova Micro Model**: Most cost-effective Bedrock model
3. **Lambda Memory**: Optimized at 256 MB (good balance of cost and performance)
4. **No Always-On Servers**: Lambda only runs when invoked

### Cost Estimation by Usage Level

#### Light Usage (5 updates/day)
```
Bedrock: ~$1-3/month
Total: ~$1-3/month
```

#### Moderate Usage (20 updates/day)
```
Bedrock: ~$4-12/month
Total: ~$4-12/month
```

#### Heavy Usage (100 updates/day)
```
Bedrock: ~$20-60/month
API Gateway: Free (1M requests = 100 * 30 = 3K)
Lambda: Free
DynamoDB: Free (on-demand)
Total: ~$20-60/month
```

### Reducing Costs Further

- **Use Nova Micro**: Already using the most cost-effective model
- **Limited History**: Consider archiving old history to S3 (advanced)
- **Regional Selection**: Choose cheaper AWS region (us-east-1 is typically cheapest)

### Monitoring Costs

To monitor your AWS costs:

1. Go to [AWS Cost Explorer](https://console.aws.amazon.com/cost-management/home)
2. View costs by service
3. Set up billing alerts:
   - AWS Billing → Budgets → Create budget
   - Set limit to $5/month
   - Receive email alerts if spending exceeds threshold

## Cleanup Instructions

### Important: Avoid Unexpected Charges

When you're done using StandupDrafter, clean up AWS resources to avoid charges. The application is designed for easy cleanup.

### Step 1: Delete All Resources

Run the destroy command:

```bash
cdk destroy
```

You will be prompted:

```
Are you sure you want to delete: StandupDrafterStack (y/n)?
```

Type `y` and press Enter to confirm.

### What Gets Deleted

- Amazon S3 bucket (website files deleted)
- Amazon DynamoDB table (all history deleted)
- AWS Lambda function
- API Gateway endpoints
- IAM roles and policies
- CloudWatch Log groups

**Important**: This is permanent and cannot be undone. Ensure you have exported any important data first.

### Step 2: Verify Cleanup

Verify resources are deleted:

```bash
aws s3 ls
aws dynamodb list-tables
aws lambda list-functions
```

You should see no StandupDrafter-related resources.

### Step 3: Remove Local Files (Optional)

To clean up your local directory:

```bash
rm -rf node_modules cdk.out
```

### Cost After Cleanup

Once resources are deleted, you will only be charged for:
- Any stored data in S3 backups (if enabled)
- Data transfer costs (usually minimal)

**Important**: If you accidentally deploy and forget to clean up, AWS Free Tier will cover the first 12 months. After that, charges may apply.

## Project Structure

```
standup-drafter/
├── bin/
│   └── standup-drafter.ts       # CDK app entry point
├── lib/
│   └── standup-drafter-stack.ts # Main CDK stack definition
├── lambda/
│   └── lambda_function.py       # Lambda handler (Python)
├── frontend/
│   ├── index.html               # Web application HTML
│   ├── styles.css               # Application styles
│   └── app.js                   # Frontend JavaScript
├── cdk.json                     # CDK configuration
├── package.json                 # Node.js dependencies
├── package-lock.json            # Locked dependency versions
├── tsconfig.json                # TypeScript configuration
├── README.md                    # This file
└── .gitignore                   # Git ignore rules
```

## Development

### Available Commands

- **Build TypeScript**: `npm run build`
- **Watch mode**: `npm run watch` (auto-rebuild on file changes)
- **Run tests**: `npm test`
- **CDK commands**: `npm run cdk <command>`

### Typical Development Workflow

1. Make code changes
2. Run `npm run build` to compile
3. Run `npm run build && cdk deploy` to update deployment
4. Test changes in browser
5. Repeat as needed

### Destroying and Redeploying

To start fresh:

```bash
cdk destroy && npm run build && cdk deploy
```

## License

MIT

---

## Troubleshooting

### Common Issues

#### "AWS CLI not configured"
Run `aws configure` with your access keys (see [AWS Credentials Configuration](#aws-credentials-configuration))

#### "cdk bootstrap failed"
Ensure your AWS credentials are correct and you have permissions to create S3 buckets and IAM roles

#### "cdk deploy timeout"
Very large deployments may take longer. Be patient - usually completes within 5 minutes.

#### "Lambda function errors"
Check CloudWatch Logs:
```bash
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/
```

#### "DynamoDB table doesn't exist"
Ensure `cdk deploy` completed successfully and all resources were created

#### "Cannot access S3 website URL"
- Verify the S3 bucket exists and is public
- Check your browser's CORS settings aren't blocking the request
- Wait a few minutes after deployment for S3 website hosting to be fully ready

## Support

For issues or questions:
1. Check AWS documentation: https://docs.aws.amazon.com/
2. Review the project design document in `.kiro/specs/standup-drafter/design.md`
3. Check CloudWatch Logs for error details
4. Verify all prerequisites are installed correctly
