# 🚀 Complete Deployment Guide for StandupDrafter
## Step-by-Step Instructions for First-Time Deployers

---

## 📋 What You'll Need Before Starting

Before you begin, make sure you have these installed on your computer:

### 1. **AWS Account** (Free Tier)
- Create an account at https://aws.amazon.com
- Sign up for the AWS Free Tier (includes Lambda, DynamoDB, S3, API Gateway)
- **No credit card needed to get started**, though you'll be asked to provide one for verification

### 2. **AWS CLI v2** (Command Line Tool for AWS)
- Download from: https://aws.amazon.com/cli/
- Choose your operating system (Windows, Mac, or Linux)
- Follow the installation wizard
- **Verify it installed**: Open terminal/command prompt and run:
  ```bash
  aws --version
  ```
  You should see something like: `aws-cli/2.x.x`

### 3. **Node.js 18 or Higher**
- Download from: https://nodejs.org/
- Choose the LTS (Long Term Support) version
- Follow the installation wizard
- **Verify it installed**: Open terminal/command prompt and run:
  ```bash
  node --version
  npm --version
  ```
  You should see version numbers for both

### 4. **AWS CDK (Cloud Development Kit)**
- This is a tool to deploy infrastructure
- You'll install this in Step 4 below (don't do it now)

---

## 🔐 Step 1: Configure AWS Credentials

This tells your computer how to connect to your AWS account.

### What to Do:

1. **Log into AWS Console**:
   - Go to https://console.aws.amazon.com
   - Sign in with your AWS account email and password

2. **Create Access Keys**:
   - Click on your name (top-right corner) → "Security credentials"
   - Click "Create access key" button
   - Choose "Command Line Interface (CLI)" option
   - Click "I understand..." checkbox
   - Click "Create access key"
   - **IMPORTANT**: Copy and save these somewhere safe (you'll only see them once):
     - Access Key ID
     - Secret Access Key

3. **Open Terminal/Command Prompt** on your computer

4. **Configure AWS Credentials**:
   ```bash
   aws configure
   ```
   
   You'll be asked to enter:
   - **AWS Access Key ID**: Paste the one you copied above
   - **AWS Secret Access Key**: Paste the one you copied above
   - **Default region name**: Enter `us-east-1` (this is a good default)
   - **Default output format**: Just press Enter (leave blank)

5. **Verify it worked**:
   ```bash
   aws sts get-caller-identity
   ```
   You should see your AWS account information printed out. If you see an error, go back and check your keys.

---

## 📁 Step 2: Open Your Project Folder

The StandupDrafter project is already on your computer. Let's open it.

### What to Do:

1. **Open Terminal/Command Prompt**

2. **Navigate to the project folder**:
   ```bash
   cd "/home/jawad533/Kiro Project"
   ```
   Or on Windows:
   ```bash
   cd "C:\path\to\Kiro Project"
   ```

3. **Verify you're in the right place**:
   ```bash
   ls
   ```
   You should see folders like `frontend`, `lambda`, `lib`, `node_modules`, etc.

---

## 📦 Step 3: Install Project Dependencies

This downloads all the code libraries the project needs.

### What to Do:

1. **Still in the project folder**, run:
   ```bash
   npm install
   ```
   
   This will take 2-5 minutes. You'll see lots of text scrolling by. Don't worry, that's normal.

2. **Wait for it to finish**. When complete, you should see:
   ```
   added XXX packages in XXm
   ```

3. **Verify it worked**:
   ```bash
   npm --version
   ```
   Should show a version number

---

## 🛠️ Step 4: Install AWS CDK

This is the tool that will deploy everything to AWS.

### What to Do:

1. **Still in the project folder**, run:
   ```bash
   npm install -g aws-cdk
   ```
   
   The `-g` flag means "install globally" (on your whole computer, not just this project).

2. **Wait for it to finish** (about 1-2 minutes)

3. **Verify it worked**:
   ```bash
   cdk --version
   ```
   You should see a version number like `2.x.x`

---

## 🔧 Step 5: Bootstrap Your AWS Account (First Time Only)

CDK needs to set up some things in your AWS account before it can deploy. You only do this once per AWS region.

### What to Do:

1. **Still in the project folder**, run:
   ```bash
   cdk bootstrap
   ```

2. **You'll be asked**: "Do you want to proceed?" → Type `y` and press Enter

3. **Wait 2-3 minutes**. You'll see messages like:
   - "Creating CloudFormation changeset..."
   - "Executing CloudFormation changeset..."
   - Finally: "✓ Bootstrap complete!"

4. **If you get an error** about "Access Denied":
   - Your AWS credentials aren't working
   - Go back to Step 1 and double-check your Access Key ID and Secret Access Key

---

## 🚀 Step 6: Deploy the Application

This is the main deployment step that creates everything in AWS.

### What to Do:

1. **Still in the project folder**, run:
   ```bash
   cdk deploy
   ```

2. **Review the changes**:
   - You'll see a summary of all the AWS resources that will be created
   - Look for:
     - DynamoDB table
     - Lambda function
     - API Gateway
     - S3 bucket
     - IAM roles

3. **You'll be asked**: "Do you want to proceed with these changes?" → Type `y` and press Enter

4. **Wait 3-5 minutes** for deployment. You'll see:
   - "Creating CloudFormation changeset..."
   - "Deploying changeset..."
   - Resource creation progress
   - Finally: "✅ Stack created successfully"

5. **At the end, you'll see Outputs**:
   ```
   Outputs:
   StandupDrafterStack.WebsiteURL = http://standup-drafter-12345.s3-website-us-east-1.amazonaws.com/
   StandupDrafterStack.ApiEndpoint = https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/
   ```

6. **IMPORTANT**: Copy and save these URLs! You'll need them.

---

## ✅ Step 7: Verify the Deployment Worked

Let's make sure everything deployed correctly.

### What to Do:

1. **Copy the WebsiteURL** from the outputs above (the one that looks like a link to an S3 bucket)

2. **Open your web browser** (Chrome, Firefox, Safari, etc.)

3. **Paste the WebsiteURL** into the address bar

4. **Press Enter**

5. **You should see**:
   - A page titled "StandupDrafter"
   - A textarea that says "Paste your work notes here..."
   - A "Generate Update" button
   - A history section below

6. **If you don't see this**:
   - Wait 30 seconds and refresh the page
   - If still not working, check the troubleshooting section below

---

## 🧪 Step 8: Test the Application

Now let's test that it actually works.

### What to Do:

1. **In the text area**, paste some work notes like:
   ```
   - Fixed login bug this morning
   - Started working on the user dashboard feature
   - Waiting for design approval from the team
   ```

2. **Click the "Generate Update" button**

3. **Wait 2-3 seconds**. You should see:
   - A loading spinner appears
   - Then a formatted status update appears with sections:
     - **Done:** Fixed login bug this morning
     - **In Progress:** Started working on the user dashboard feature
     - **Blockers:** Waiting for design approval from the team

4. **If it works**: ✅ Deployment successful! You can skip the troubleshooting.

5. **If you get an error** (red error message):
   - Check the troubleshooting section below

---

## 🧠 Understanding What Got Deployed

Here's what's now running on AWS (don't worry if you don't understand all of it):

### 📊 **DynamoDB Table** (Database)
- Stores all the status updates you generate
- Keeps a history of everything
- Located in your AWS account

### ⚡ **Lambda Function** (Server)
- Runs Python code that processes your requests
- Calls Amazon Bedrock AI to format your notes
- Returns the formatted update
- Runs only when needed (serverless = no server to manage)

### 🌐 **API Gateway** (API)
- Acts like a doorway between your web app and the Lambda function
- Your browser sends requests to it
- It forwards them to Lambda

### 🤖 **Amazon Bedrock AI** (AI Service)
- The AI that actually formats your notes into professional updates
- Uses Nova Micro or Nova Lite model

### 📦 **S3 Bucket** (Website)
- Stores and serves your website (HTML, CSS, JavaScript)
- Makes it accessible from anywhere on the internet

### 🔐 **IAM Roles** (Permissions)
- Controls what each service can do
- Lambda can access DynamoDB, Bedrock, and CloudWatch Logs

---

## 💰 Cost Information

**Good news: This should be FREE!** Here's why:

- **Lambda**: 1 million requests/month free
- **DynamoDB**: 25 GB storage and 25 read/write units free
- **S3**: 5 GB storage free
- **API Gateway**: 1 million API calls/month free
- **Bedrock**: You pay per use, but light testing is cheap (~$0.01 per request)

**Your estimated cost**: $0 - $5/month for light personal use

---

## 🐛 Troubleshooting Common Issues

### Issue 1: "Command not found: aws"
**Solution**: AWS CLI isn't installed or not in your PATH
- Reinstall AWS CLI from https://aws.amazon.com/cli/
- Restart your terminal after installation
- Try `aws --version` again

### Issue 2: "Command not found: cdk"
**Solution**: AWS CDK isn't installed
- Run: `npm install -g aws-cdk`
- Restart your terminal
- Try `cdk --version` again

### Issue 3: "Access Denied" when running `cdk bootstrap` or `cdk deploy`
**Solution**: Your AWS credentials are wrong
- Go back to Step 1
- Create new Access Keys (don't reuse old ones)
- Run `aws configure` again with the new keys
- Try the deployment again

### Issue 4: Website won't load (404 error)
**Solution**: S3 bucket website hosting might not be enabled yet
- Wait 1-2 minutes and refresh
- Check in AWS Console:
  - Go to S3
  - Find the bucket named "standup-drafter-xxx"
  - Check "Properties" → "Static website hosting" is enabled
- If still broken, run `cdk deploy` again

### Issue 5: "Generate Update" button doesn't work or shows error
**Solution**: Lambda or API Gateway might have an issue
- Check in AWS CloudWatch:
  - Go to CloudWatch → Log Groups
  - Find "/aws/lambda/..." group
  - Check the latest logs for error messages
- Try refreshing the page and trying again
- Check that Bedrock Nova models are available in your region

### Issue 6: "Service Unavailable" or timeout error
**Solution**: Bedrock service might not be available in your region
- Check if Nova models are available in `us-east-1`
- If not, deploy to a different region where they're available
- To change region:
  - Edit `cdk.json`
  - Change `"context"` region value
  - Run `cdk deploy` again

---

## 🎯 Next Steps After Deployment

### Option 1: Use It
- Just start using the app!
- Generate updates, test copy-to-clipboard, check history

### Option 2: Run Automated Tests
```bash
npm test
```
This runs 60 automated tests to verify everything works correctly.

### Option 3: Modify and Redeploy
If you want to change something:
1. Edit the code (frontend, Lambda, or CDK)
2. Run `cdk deploy` again
3. Changes are live within seconds

---

## 🧹 Cleaning Up (Stop Paying for AWS Resources)

When you're done, delete everything to avoid any charges:

### What to Do:

1. **In your terminal**, run:
   ```bash
   cdk destroy
   ```

2. **You'll be asked**: "Are you sure?" → Type `y` and press Enter

3. **Wait 2-3 minutes** for deletion

4. **Verify it's deleted**:
   - Go to AWS Console → CloudFormation
   - Your stack should be gone
   - Go to S3 bucket → should be deleted

5. **Done!** All AWS resources are removed.

---

## 📚 Helpful AWS Concepts

### CloudFormation Stack
- A collection of AWS resources deployed together
- Think of it as a "project" or "deployment"

### Infrastructure as Code (IaC)
- Code that describes your infrastructure
- Instead of clicking in AWS Console, you write code
- CDK helps write this code in TypeScript

### Serverless
- You don't manage servers
- AWS manages all the infrastructure
- You just write code and deploy it

### DynamoDB
- NoSQL database (different from traditional SQL databases)
- Great for applications that need to scale
- Charges per read/write unit

---

## 🆘 Getting Help

If something goes wrong:

1. **Check AWS CloudWatch Logs**:
   - Go to https://console.aws.amazon.com
   - Search for "CloudWatch"
   - Click "Log Groups"
   - Look for logs related to your service
   - Error messages will be there

2. **Check Terminal Output**:
   - When you run `cdk deploy`, errors print to terminal
   - Scroll up to see what went wrong

3. **Common Error Codes**:
   - `AccessDenied` = Your credentials don't have permission
   - `ResourceAlreadyExists` = Resource already exists (usually harmless)
   - `ThrottlingException` = You're making too many requests (usually temporary)

4. **Re-run Deployment**:
   - Usually safe to run `cdk deploy` again
   - It will fix most issues automatically

---

## ✨ Congratulations!

You've successfully deployed a full serverless application to AWS! 🎉

**What you've accomplished**:
- ✅ Created AWS infrastructure using CDK
- ✅ Deployed a Lambda function running Python
- ✅ Set up a DynamoDB database
- ✅ Created an API Gateway REST API
- ✅ Hosted a static website on S3
- ✅ Integrated with Amazon Bedrock AI
- ✅ Tested end-to-end functionality

**You're now ready to**:
- Build more serverless applications
- Deploy to production
- Scale your application

---

## 📖 Quick Reference Commands

```bash
# Configure AWS credentials
aws configure

# Verify AWS credentials work
aws sts get-caller-identity

# Install project dependencies
npm install

# Install AWS CDK globally
npm install -g aws-cdk

# Bootstrap your AWS account (first time only)
cdk bootstrap

# Deploy the application
cdk deploy

# View deployed resources in CloudFormation
aws cloudformation describe-stacks --stack-name StandupDrafterStack

# See CloudWatch logs
aws logs tail /aws/lambda/GenerateFunction --follow

# Delete everything (cleanup)
cdk destroy

# Run tests
npm test
```

---

## 📞 Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **CDK Documentation**: https://docs.aws.amazon.com/cdk/v2/guide/
- **AWS Free Tier**: https://aws.amazon.com/free/
- **Stack Overflow**: Search your error message here
- **AWS Support**: https://console.aws.amazon.com/support/

---

**Happy deploying! 🚀**

If you follow these steps exactly as written, you'll have a working StandupDrafter application deployed to AWS in about 20-30 minutes.
