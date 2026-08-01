"""
Lambda function handler for StandupDrafter
Handles status update generation and history retrieval
"""

import json
import boto3
import os
from typing import Dict, Any
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize boto3 clients
dynamodb = boto3.resource('dynamodb')
bedrock_runtime = boto3.client('bedrock-runtime')


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main entry point for Lambda function
    Routes requests based on HTTP method
    
    Args:
        event: API Gateway event with httpMethod, body, queryStringParameters
        context: Lambda context object
        
    Returns:
        API Gateway response with statusCode, headers, and body
    """
    try:
        # Log incoming request
        logger.info(f"Received {event.get('httpMethod')} request")
        
        # Route based on HTTP method
        http_method = event.get('httpMethod', '')
        
        if http_method == 'POST':
            return handle_generate(event)
        elif http_method == 'GET':
            return handle_history(event)
        else:
            logger.warning(f"Method not allowed: {http_method}")
            return error_response(405, "Method not allowed")
            
    except Exception as e:
        # Top-level exception handling
        logger.error(f"Unexpected error in lambda_handler: {str(e)}", exc_info=True)
        return error_response(500, "Internal server error")


def construct_prompt(notes: str) -> str:
    """
    Build the prompt for Bedrock AI to format user notes into status update
    
    Args:
        notes: Raw user notes (unformatted text)
        
    Returns:
        Formatted prompt string with instructions for three-section output
    """
    return f"""Transform these work notes into a professional status update formatted into three sections:

**Done:**
- List completed tasks

**In Progress:**
- List ongoing work

**Blockers:**
- List any blockers or challenges (or write "None" if there are no blockers)

Raw notes:
{notes}

Format the output with clear section headers and bullet points."""


def extract_text_from_response(response: Dict[str, Any]) -> str:
    """
    Parse Bedrock response structure to extract generated text
    
    Args:
        response: Bedrock converse() API response dictionary
        
    Returns:
        Extracted text content from response
        
    Raises:
        ValueError: If response structure is invalid or missing expected fields
    """
    try:
        # Navigate the response structure: output -> message -> content -> text
        content = response['output']['message']['content']
        if content and len(content) > 0:
            text = content[0]['text']
            if text:
                return text
            raise ValueError("Text content is empty")
        raise ValueError("No content in response")
    except (KeyError, IndexError, TypeError) as e:
        logger.error(f"Invalid Bedrock response structure: {str(e)}")
        raise ValueError(f"Invalid response structure: {str(e)}")


def invoke_bedrock(notes: str) -> str:
    """
    Invoke Amazon Bedrock to generate formatted status update
    
    Args:
        notes: Raw user notes
        
    Returns:
        Formatted status update with Done/In Progress/Blockers sections
        
    Raises:
        Exception: If Bedrock invocation fails or times out
    """
    try:
        # Construct the prompt with three-section instructions
        prompt = construct_prompt(notes)
        
        # Get model ID from environment variable
        model_id = os.environ.get('BEDROCK_MODEL_ID', 'amazon.nova-micro-v1:0')
        
        logger.info(f"Invoking Bedrock model: {model_id}")
        
        # Invoke Bedrock using converse API
        response = bedrock_runtime.converse(
            modelId=model_id,
            messages=[
                {
                    "role": "user",
                    "content": [{"text": prompt}]
                }
            ],
            inferenceConfig={
                "maxTokens": 500,
                "temperature": 0.7
            }
        )
        
        # Extract and return the generated text
        status_update = extract_text_from_response(response)
        logger.info("Successfully generated status update from Bedrock")
        return status_update
        
    except bedrock_runtime.exceptions.ModelTimeoutException as e:
        logger.error(f"Bedrock request timed out: {str(e)}")
        raise Exception("AI service request timed out. Please try again.")
    except bedrock_runtime.exceptions.ThrottlingException as e:
        logger.error(f"Bedrock request throttled: {str(e)}")
        raise Exception("AI service is currently busy. Please try again in a moment.")
    except ValueError as e:
        # Re-raise parsing errors from extract_text_from_response
        logger.error(f"Failed to parse Bedrock response: {str(e)}")
        raise Exception("Failed to parse AI response. Please try again.")
    except Exception as e:
        logger.error(f"Bedrock invocation failed: {str(e)}", exc_info=True)
        raise Exception("AI service request failed. Please try again.")


def handle_generate(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle POST /generate requests
    Generates formatted status update from user notes
    
    Args:
        event: API Gateway event containing request body with userId and notes
        
    Returns:
        Success response with statusUpdate and timestamp, or error response
    """
    # Placeholder for task 4.2
    logger.info("handle_generate called - implementation pending")
    return error_response(501, "Generate endpoint not yet implemented")


def query_history(user_id: str, limit: int = 50) -> list:
    """
    Query update history from DynamoDB
    
    Args:
        user_id: User identifier to query updates for
        limit: Maximum number of items to return (default 50)
        
    Returns:
        List of update items with timestamp, statusUpdate, and originalNotes
        
    Raises:
        Exception: If DynamoDB query fails
    """
    try:
        table = dynamodb.Table(os.environ['DYNAMODB_TABLE_NAME'])
        
        # Query by userId with descending sort by timestamp
        response = table.query(
            KeyConditionExpression='userId = :uid',
            ExpressionAttributeValues={':uid': user_id},
            ScanIndexForward=False,  # Descending order (newest first)
            Limit=limit
        )
        
        # Extract items from response
        items = response.get('Items', [])
        logger.info(f"Retrieved {len(items)} items for user {user_id}")
        
        return items
        
    except Exception as e:
        logger.error(f"Error querying DynamoDB: {str(e)}", exc_info=True)
        raise


def handle_history(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle GET /history requests
    Retrieves user's update history from DynamoDB
    
    Args:
        event: API Gateway event containing query parameters with userId
        
    Returns:
        Success response with updates array, or error response
    """
    # Placeholder for task 5.3
    logger.info("handle_history called - implementation pending")
    return error_response(501, "History endpoint not yet implemented")


def error_response(status_code: int, message: str) -> Dict[str, Any]:
    """
    Generate standardized error response with CORS headers
    
    Args:
        status_code: HTTP status code
        message: Error message to return to client
        
    Returns:
        API Gateway response dict with error structure
    """
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Requested-With',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        'body': json.dumps({
            'success': False,
            'error': message
        })
    }


def success_response(status_code: int, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate standardized success response with CORS headers
    
    Args:
        status_code: HTTP status code (typically 200)
        data: Dictionary of data to include in response
        
    Returns:
        API Gateway response dict with success structure
    """
    response_data = {'success': True}
    response_data.update(data)
    
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Requested-With',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        'body': json.dumps(response_data)
    }


def store_update(user_id: str, timestamp: str, notes: str, status_update: str) -> None:
    """
    Store update record in DynamoDB
    
    This function stores a status update to DynamoDB with error handling.
    If storage fails, the error is logged but not raised - the update should
    still be returned to the user (non-blocking error handling).
    
    Args:
        user_id: User identifier (partition key)
        timestamp: ISO 8601 timestamp with milliseconds (sort key)
        notes: Original user notes
        status_update: Generated formatted status update
        
    Raises:
        Does not raise exceptions - logs errors instead for non-blocking behavior
    """
    try:
        # Get table reference from environment variable
        table_name = os.environ.get('DYNAMODB_TABLE_NAME')
        if not table_name:
            logger.error("DYNAMODB_TABLE_NAME environment variable not set")
            return
        
        table = dynamodb.Table(table_name)
        
        # Store item in DynamoDB
        table.put_item(
            Item={
                'userId': user_id,
                'timestamp': timestamp,
                'originalNotes': notes,
                'statusUpdate': status_update
            }
        )
        
        logger.info(f"Successfully stored update for user {user_id} at {timestamp}")
        
    except Exception as e:
        # Log error but don't raise - storage failure shouldn't prevent
        # returning the generated update to the user
        logger.error(f"Failed to store update to DynamoDB: {str(e)}", exc_info=True)
        logger.error(f"Update details - userId: {user_id}, timestamp: {timestamp}")
