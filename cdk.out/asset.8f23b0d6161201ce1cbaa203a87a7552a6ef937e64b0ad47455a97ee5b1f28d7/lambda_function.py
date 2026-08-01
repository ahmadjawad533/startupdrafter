"""
Lambda function handler for StandupDrafter
Handles status update generation and history retrieval
"""

import json
import boto3
from boto3.dynamodb.conditions import Key
import os
from typing import Dict, Any
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize boto3 clients
dynamodb = boto3.resource('dynamodb')


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


def format_status_update(notes: str) -> str:
    """
    Format user notes into a professional status update using rule-based categorization
    
    Parses the raw notes and categorizes each item into Done, In Progress, or Blockers
    using keyword heuristics. Items are separated by commas or newlines.
    
    Args:
        notes: Raw user notes (unformatted text)
        
    Returns:
        Formatted status update with Done/In Progress/Blockers sections
    """
    # Keywords to identify different categories
    blocker_keywords = {'blocked', 'blocking', 'stuck', 'waiting', 'waiting for', 'pending', 'unable', 'cannot', 'can\'t', 'failed', 'failed to', 'issue', 'problem', 'problem with', 'error'}
    in_progress_keywords = {'started', 'starting', 'working on', 'working', 'in progress', 'ongoing', 'continuing', 'refactor', 'refactoring', 'update', 'updating', 'implement', 'implementing', 'develop', 'developing', 'building', 'build', 'testing', 'test', 'review', 'reviewing'}
    
    # Parse items from notes (split by newlines and commas)
    items = []
    for line in notes.split('\n'):
        # Split each line by commas and strip whitespace
        for item in line.split(','):
            item = item.strip()
            if item:
                # Remove common bullet point characters and dashes
                item = item.lstrip('- •*').strip()
                if item:
                    items.append(item)
    
    done_items = []
    in_progress_items = []
    blocker_items = []
    
    # Categorize each item using keyword heuristics
    for item in items:
        item_lower = item.lower()
        
        # Check for blocker keywords
        is_blocker = any(keyword in item_lower for keyword in blocker_keywords)
        # Check for in-progress keywords
        is_in_progress = any(keyword in item_lower for keyword in in_progress_keywords)
        
        if is_blocker:
            blocker_items.append(item)
        elif is_in_progress:
            in_progress_items.append(item)
        else:
            done_items.append(item)
    
    # Build formatted output matching Bedrock's three-section format
    sections = []
    
    if done_items:
        sections.append('**Done:**')
        for item in done_items:
            sections.append(f'- {item}')
    else:
        sections.append('**Done:**')
        sections.append('- None')
    
    sections.append('')  # Blank line between sections
    
    if in_progress_items:
        sections.append('**In Progress:**')
        for item in in_progress_items:
            sections.append(f'- {item}')
    else:
        sections.append('**In Progress:**')
        sections.append('- None')
    
    sections.append('')  # Blank line between sections
    
    if blocker_items:
        sections.append('**Blockers:**')
        for item in blocker_items:
            sections.append(f'- {item}')
    else:
        sections.append('**Blockers:**')
        sections.append('- None')
    
    return '\n'.join(sections)


def handle_generate(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle POST /generate requests
    Generates formatted status update from user notes
    
    Args:
        event: API Gateway event containing request body with userId and notes
        
    Returns:
        Success response with statusUpdate and timestamp, or error response
    """
    try:
        # Parse request body
        body = event.get('body', '{}')
        if isinstance(body, str):
            request_data = json.loads(body)
        else:
            request_data = body
        
        # Extract and validate userId
        user_id = request_data.get('userId', '').strip()
        if not user_id:
            logger.warning("Missing or empty userId in request")
            return error_response(400, "userId is required")
        
        # Extract and validate notes
        notes = request_data.get('notes', '').strip()
        if not notes:
            logger.warning("Missing or empty notes in request")
            return error_response(400, "notes cannot be empty or whitespace")
        
        logger.info(f"Processing generate request for user {user_id}")
        
        # Format notes into status update using rule-based categorization
        status_update = format_status_update(notes)
        
        # Generate ISO 8601 timestamp with milliseconds
        from datetime import datetime
        timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
        
        # Store result to DynamoDB (non-blocking - errors are logged internally)
        store_update(user_id, timestamp, notes, status_update)
        
        # Return success response with statusUpdate and timestamp
        logger.info(f"Successfully generated update for user {user_id}")
        return success_response(200, {
            'statusUpdate': status_update,
            'timestamp': timestamp
        })
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in request body: {str(e)}")
        return error_response(400, "Invalid JSON in request body")
    except Exception as e:
        # Handle any errors from invoke_bedrock or other operations
        logger.error(f"Error in handle_generate: {str(e)}", exc_info=True)
        error_message = str(e) if str(e) else "Failed to generate status update"
        return error_response(500, error_message)


def query_history(user_id: str, limit: int = 50) -> list:
    """
    Query update history from DynamoDB
    
    Args:
        user_id: User identifier to query updates for
        limit: Maximum number of items to return (default 50)
        
    Returns:
        List of update items with timestamp, statusUpdate, and originalNotes fields
        
    Raises:
        Exception: If DynamoDB query fails
    """
    try:
        table = dynamodb.Table(os.environ['DYNAMODB_TABLE_NAME'])
        
        # Query by userId with KeyConditionExpression, sorted descending by timestamp
        response = table.query(
            KeyConditionExpression=Key('userId').eq(user_id),
            ScanIndexForward=False,  # Descending order (newest first)
            Limit=limit
        )
        
        # Extract items from response and return only the required fields
        raw_items = response.get('Items', [])
        items = [
            {
                'timestamp': item.get('timestamp', ''),
                'statusUpdate': item.get('statusUpdate', ''),
                'originalNotes': item.get('originalNotes', '')
            }
            for item in raw_items
        ]
        
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
    try:
        # Extract userId from query string parameters
        query_params = event.get('queryStringParameters')
        
        # Validate query parameters exist
        if not query_params:
            logger.warning("Missing query parameters in history request")
            return error_response(400, "Missing query parameters")
        
        # Extract and validate userId
        user_id = query_params.get('userId')
        if not user_id or not user_id.strip():
            logger.warning("Missing or empty userId in query parameters")
            return error_response(400, "userId is required")
        
        logger.info(f"Retrieving history for user: {user_id}")
        
        # Query DynamoDB for user's update history
        try:
            updates = query_history(user_id)
            logger.info(f"Successfully retrieved {len(updates)} updates")
            
            # Return success response with updates array
            return success_response(200, {'updates': updates})
            
        except Exception as db_error:
            # Handle DynamoDB errors by returning empty array and logging error
            logger.error(f"DynamoDB error in handle_history: {str(db_error)}", exc_info=True)
            # Return empty array but still indicate success to client
            return success_response(200, {'updates': []})
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"Unexpected error in handle_history: {str(e)}", exc_info=True)
        return error_response(500, "Failed to retrieve history")


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
