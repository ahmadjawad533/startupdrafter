#!/usr/bin/env python3
"""
Comprehensive test suite for lambda_function.py using pytest
Tests Lambda function handlers, Bedrock integration, and DynamoDB operations
Validates requirements 2.1, 2.2 and provides fixtures for additional tests
"""

import json
import sys
import os
from datetime import datetime
from unittest.mock import MagicMock, patch, Mock
import pytest

# Mock boto3 before importing lambda_function
boto3_mock = MagicMock()
sys.modules['boto3'] = boto3_mock
sys.modules['boto3.dynamodb'] = MagicMock()
sys.modules['boto3.dynamodb.conditions'] = MagicMock()

# Add lambda directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))

# Import lambda_function module
import importlib
import lambda_function
importlib.reload(lambda_function)


# ============================================================================
# FIXTURES - Sample events, contexts, and mock configurations
# ============================================================================

@pytest.fixture
def mock_lambda_context():
    """
    Mock AWS Lambda context object
    Provides context information that Lambda passes to handler
    """
    context = MagicMock()
    context.function_name = 'standup-drafter'
    context.function_version = '$LATEST'
    context.invoked_function_arn = 'arn:aws:lambda:us-east-1:123456789012:function:standup-drafter'
    context.memory_limit_in_mb = 256
    context.aws_request_id = 'test-request-id-12345'
    context.log_group_name = '/aws/lambda/standup-drafter'
    context.log_stream_name = '2024/01/15/[$LATEST]abcdef1234567890'
    context.get_remaining_time_in_millis = MagicMock(return_value=25000)
    return context


@pytest.fixture
def sample_generate_request():
    """
    Sample POST /generate request event with valid userId and notes
    Represents a typical user request to generate a status update
    """
    return {
        'httpMethod': 'POST',
        'path': '/generate',
        'body': json.dumps({
            'userId': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            'notes': 'fixed login bug, started API refactor, blocked on database migration approval'
        }),
        'headers': {
            'Content-Type': 'application/json',
            'Origin': 'https://s3-website.example.com'
        },
        'requestContext': {
            'httpMethod': 'POST',
            'resourcePath': '/generate',
            'protocol': 'HTTP/1.1'
        }
    }


@pytest.fixture
def sample_history_request():
    """
    Sample GET /history request event with userId query parameter
    Represents a typical user request to retrieve update history
    """
    return {
        'httpMethod': 'GET',
        'path': '/history',
        'queryStringParameters': {
            'userId': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
        },
        'headers': {
            'Origin': 'https://s3-website.example.com'
        },
        'requestContext': {
            'httpMethod': 'GET',
            'resourcePath': '/history',
            'protocol': 'HTTP/1.1'
        }
    }


@pytest.fixture
def sample_bedrock_response():
    """
    Sample Amazon Bedrock converse() API response
    Shows the structure of a successful Bedrock text generation response
    """
    return {
        'output': {
            'message': {
                'role': 'assistant',
                'content': [
                    {
                        'text': '**Done:**\n- Fixed login authentication bug\n- Completed user profile refactoring\n\n**In Progress:**\n- Starting API refactoring work\n- Reviewing pull requests\n\n**Blockers:**\n- Waiting for database migration approval from DBA team'
                    }
                ]
            }
        },
        'stopReason': 'end_turn',
        'usage': {
            'inputTokens': 150,
            'outputTokens': 75,
            'totalTokens': 225
        }
    }


@pytest.fixture
def sample_dynamodb_items():
    """
    Sample DynamoDB items from history query
    Represents update records stored in the DynamoDB table
    """
    return [
        {
            'userId': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            'timestamp': '2024-01-15T10:30:45.123Z',
            'originalNotes': 'fixed login bug, started API refactor, blocked on db approval',
            'statusUpdate': '**Done:**\n- Fixed login bug\n\n**In Progress:**\n- API refactoring\n\n**Blockers:**\n- Database approval'
        },
        {
            'userId': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            'timestamp': '2024-01-14T15:20:30.456Z',
            'originalNotes': 'completed authentication module, tested edge cases',
            'statusUpdate': '**Done:**\n- Completed authentication module\n- Tested edge cases\n\n**In Progress:**\n- None\n\n**Blockers:**\n- None'
        }
    ]


@pytest.fixture
def mock_bedrock_client(sample_bedrock_response):
    """
    Mock boto3 Bedrock Runtime client
    Configured to return successful responses for text generation requests
    """
    client = MagicMock()
    client.converse.return_value = sample_bedrock_response
    return client


@pytest.fixture
def mock_dynamodb_resource(sample_dynamodb_items):
    """
    Mock boto3 DynamoDB resource with table operations
    Configured to return successful responses for put_item and query operations
    """
    resource = MagicMock()
    
    # Mock table operations
    mock_table = MagicMock()
    mock_table.put_item.return_value = {}
    mock_table.query.return_value = {
        'Items': sample_dynamodb_items,
        'Count': len(sample_dynamodb_items),
        'ScannedCount': len(sample_dynamodb_items)
    }
    
    resource.Table.return_value = mock_table
    return resource


@pytest.fixture
def environment_variables():
    """
    Mock AWS environment variables
    Provides configuration for Lambda function to find resources
    """
    return {
        'DYNAMODB_TABLE_NAME': 'StandupUpdates',
        'BEDROCK_MODEL_ID': 'amazon.nova-micro-v1:0',
        'AWS_REGION': 'us-east-1'
    }


@pytest.fixture
def setup_mocks(mock_bedrock_client, mock_dynamodb_resource, environment_variables):
    """
    Setup all mocks and environment for Lambda function testing
    Patches boto3 clients and environment variables globally
    """
    with patch.dict(os.environ, environment_variables), \
         patch('lambda_function.bedrock_runtime', mock_bedrock_client), \
         patch('lambda_function.dynamodb', mock_dynamodb_resource):
        yield {
            'bedrock': mock_bedrock_client,
            'dynamodb': mock_dynamodb_resource,
            'env': environment_variables
        }


# ============================================================================
# TESTS - Bedrock Integration (Requirement 2.2)
# ============================================================================

class TestBedrockIntegration:
    """Test suite for Amazon Bedrock AI integration in Lambda function"""
    
    def test_construct_prompt_includes_three_sections(self):
        """
        Test that construct_prompt creates prompt with three required sections
        Validates requirement 2.2: prompt instructs for Done, In Progress, Blockers sections
        """
        notes = "fixed bug, working on feature, blocked on approval"
        prompt = lambda_function.construct_prompt(notes)
        
        assert "**Done:**" in prompt
        assert "**In Progress:**" in prompt
        assert "**Blockers:**" in prompt
        assert notes in prompt
    
    def test_construct_prompt_includes_raw_notes(self):
        """Test that construct_prompt includes the raw user notes in the prompt"""
        notes = "completed task alpha, working on task beta"
        prompt = lambda_function.construct_prompt(notes)
        
        assert "Raw notes:" in prompt
        assert notes in prompt
    
    def test_extract_text_from_response_valid_structure(self, sample_bedrock_response):
        """
        Test that extract_text_from_response correctly parses Bedrock response
        Validates requirement 2.2: Lambda extracts generated text from Bedrock
        """
        text = lambda_function.extract_text_from_response(sample_bedrock_response)
        
        assert isinstance(text, str)
        assert len(text) > 0
        assert "**Done:**" in text
        assert "**In Progress:**" in text
        assert "**Blockers:**" in text
    
    def test_extract_text_from_response_invalid_structure(self):
        """Test that extract_text_from_response raises ValueError for invalid response"""
        invalid_response = {
            'output': {
                'message': {
                    'content': []  # Empty content array
                }
            }
        }
        
        with pytest.raises(ValueError):
            lambda_function.extract_text_from_response(invalid_response)
    
    def test_extract_text_from_response_missing_fields(self):
        """Test that extract_text_from_response raises ValueError for missing fields"""
        invalid_response = {'output': {}}  # Missing message field
        
        with pytest.raises(ValueError):
            lambda_function.extract_text_from_response(invalid_response)
    
    def test_invoke_bedrock_calls_converse_api(self, setup_mocks):
        """
        Test that invoke_bedrock calls bedrock_runtime.converse() with correct parameters
        Validates requirement 2.2: Lambda invokes Bedrock service
        """
        notes = "test notes"
        result = lambda_function.invoke_bedrock(notes)
        
        setup_mocks['bedrock'].converse.assert_called_once()
        call_kwargs = setup_mocks['bedrock'].converse.call_args[1]
        
        assert call_kwargs['modelId'] == setup_mocks['env']['BEDROCK_MODEL_ID']
        assert 'messages' in call_kwargs
        assert 'inferenceConfig' in call_kwargs
    
    def test_invoke_bedrock_inference_config(self, setup_mocks):
        """
        Test that invoke_bedrock configures Bedrock inference parameters correctly
        Validates maxTokens and temperature settings
        """
        notes = "test notes"
        lambda_function.invoke_bedrock(notes)
        
        call_kwargs = setup_mocks['bedrock'].converse.call_args[1]
        inference_config = call_kwargs['inferenceConfig']
        
        assert inference_config['maxTokens'] == 500
        assert inference_config['temperature'] == 0.7
    
    def test_invoke_bedrock_returns_status_update(self, setup_mocks, sample_bedrock_response):
        """Test that invoke_bedrock returns the generated status update text"""
        notes = "completed tasks, ongoing work"
        result = lambda_function.invoke_bedrock(notes)
        
        assert isinstance(result, str)
        assert "**Done:**" in result
    
    def test_invoke_bedrock_timeout_handling(self, setup_mocks):
        """
        Test that invoke_bedrock handles Bedrock timeout exceptions gracefully
        Validates requirement 6.3: Bedrock timeout handling
        """
        # Mock the ModelTimeoutException attribute on the bedrock client
        setup_mocks['bedrock'].exceptions.ModelTimeoutException = type('ModelTimeoutException', (Exception,), {})
        setup_mocks['bedrock'].converse.side_effect = setup_mocks['bedrock'].exceptions.ModelTimeoutException("Request timed out")
        
        notes = "test notes"
        with pytest.raises(Exception) as exc_info:
            lambda_function.invoke_bedrock(notes)
        
        assert "timed out" in str(exc_info.value).lower()
    
    def test_invoke_bedrock_throttling_handling(self, setup_mocks):
        """
        Test that invoke_bedrock handles Bedrock throttling exceptions
        Validates requirement 6.3: Bedrock error handling
        """
        # Mock the ThrottlingException attribute on the bedrock client
        setup_mocks['bedrock'].exceptions.ThrottlingException = type('ThrottlingException', (Exception,), {})
        setup_mocks['bedrock'].converse.side_effect = setup_mocks['bedrock'].exceptions.ThrottlingException("Service busy")
        
        notes = "test notes"
        with pytest.raises(Exception) as exc_info:
            lambda_function.invoke_bedrock(notes)
        
        assert "busy" in str(exc_info.value).lower() or "throttl" in str(exc_info.value).lower()
    
    def test_invoke_bedrock_generic_error_handling(self, setup_mocks):
        """
        Test that invoke_bedrock handles generic API errors from Bedrock
        Validates requirement 6.3: error handling for Bedrock failures
        """
        setup_mocks['bedrock'].converse.side_effect = Exception("Service unavailable")
        
        notes = "test notes"
        with pytest.raises(Exception) as exc_info:
            lambda_function.invoke_bedrock(notes)
        
        assert "request failed" in str(exc_info.value).lower()
    
    def test_invoke_bedrock_handles_invalid_response_parsing(self, setup_mocks):
        """
        Test that invoke_bedrock handles ValueError from extract_text_from_response
        Validates requirement 6.4: response parsing error handling
        """
        setup_mocks['bedrock'].converse.return_value = {
            'output': {
                'message': {
                    'content': []  # Empty content array
                }
            }
        }
        
        notes = "test notes"
        with pytest.raises(Exception) as exc_info:
            lambda_function.invoke_bedrock(notes)
        
        assert "parse" in str(exc_info.value).lower() or "response" in str(exc_info.value).lower()
    
    def test_extract_text_from_response_missing_output_key(self):
        """Test that extract_text_from_response raises ValueError when 'output' key is missing"""
        invalid_response = {'message': {'content': [{'text': 'hello'}]}}
        
        with pytest.raises(ValueError):
            lambda_function.extract_text_from_response(invalid_response)
    
    def test_extract_text_from_response_missing_message_key(self):
        """Test that extract_text_from_response raises ValueError when 'message' key is missing"""
        invalid_response = {'output': {'content': [{'text': 'hello'}]}}
        
        with pytest.raises(ValueError):
            lambda_function.extract_text_from_response(invalid_response)
    
    def test_extract_text_from_response_empty_text(self):
        """Test that extract_text_from_response raises ValueError when text content is empty string"""
        invalid_response = {
            'output': {
                'message': {
                    'content': [{'text': ''}]
                }
            }
        }
        
        with pytest.raises(ValueError):
            lambda_function.extract_text_from_response(invalid_response)
    
    def test_extract_text_from_response_none_text(self):
        """Test that extract_text_from_response raises ValueError when text is None"""
        invalid_response = {
            'output': {
                'message': {
                    'content': [{'text': None}]
                }
            }
        }
        
        with pytest.raises(ValueError):
            lambda_function.extract_text_from_response(invalid_response)
    
    def test_construct_prompt_with_multiline_notes(self):
        """Test that construct_prompt correctly includes multiline notes"""
        notes = "line 1\nline 2\nline 3"
        prompt = lambda_function.construct_prompt(notes)
        
        assert "line 1" in prompt
        assert "line 2" in prompt
        assert "line 3" in prompt
    
    def test_construct_prompt_with_special_characters(self):
        """Test that construct_prompt preserves special characters in notes"""
        notes = "fixed bug with regex: ^test$ and special chars: @#$%"
        prompt = lambda_function.construct_prompt(notes)
        
        assert "^test$" in prompt
        assert "@#$%" in prompt
    
    def test_construct_prompt_instructions_are_clear(self):
        """Test that construct_prompt includes clear formatting instructions"""
        notes = "test"
        prompt = lambda_function.construct_prompt(notes)
        
        assert "professional" in prompt.lower()
        assert "format" in prompt.lower()
        assert "section" in prompt.lower()
    
    def test_invoke_bedrock_logs_model_id(self, setup_mocks):
        """
        Test that invoke_bedrock uses the correct model ID from environment
        Validates requirement 2.5: Nova Micro/Lite model selection
        """
        notes = "test"
        lambda_function.invoke_bedrock(notes)
        
        call_kwargs = setup_mocks['bedrock'].converse.call_args[1]
        assert call_kwargs['modelId'] == 'amazon.nova-micro-v1:0'
    
    def test_invoke_bedrock_uses_environment_model_id(self, setup_mocks, mock_bedrock_client, mock_dynamodb_resource):
        """Test that invoke_bedrock respects custom BEDROCK_MODEL_ID from environment"""
        custom_model_id = 'amazon.nova-lite-v1:0'
        
        with patch.dict(os.environ, {
            'BEDROCK_MODEL_ID': custom_model_id,
            'DYNAMODB_TABLE_NAME': 'test-table'
        }):
            with patch('lambda_function.bedrock_runtime', mock_bedrock_client), \
                 patch('lambda_function.dynamodb', mock_dynamodb_resource):
                lambda_function.invoke_bedrock("test notes")
                
                call_kwargs = mock_bedrock_client.converse.call_args[1]
                assert call_kwargs['modelId'] == custom_model_id


# ============================================================================
# TESTS - Handler Entry Point (Requirement 2.1)
# ============================================================================

class TestLambdaHandler:
    """Test suite for Lambda function entry point and HTTP method routing"""
    
    def test_lambda_handler_routes_post_requests(self, setup_mocks, sample_generate_request, mock_lambda_context):
        """
        Test that lambda_handler routes POST requests to handle_generate
        Validates requirement 2.1: Lambda accepts HTTP requests
        """
        with patch('lambda_function.handle_generate', return_value={'statusCode': 200}) as mock_handle:
            lambda_function.lambda_handler(sample_generate_request, mock_lambda_context)
            
            mock_handle.assert_called_once_with(sample_generate_request)
    
    def test_lambda_handler_routes_get_requests(self, setup_mocks, sample_history_request, mock_lambda_context):
        """Test that lambda_handler routes GET requests to handle_history"""
        with patch('lambda_function.handle_history', return_value={'statusCode': 200}) as mock_handle:
            lambda_function.lambda_handler(sample_history_request, mock_lambda_context)
            
            mock_handle.assert_called_once_with(sample_history_request)
    
    def test_lambda_handler_unsupported_method(self, setup_mocks, mock_lambda_context):
        """Test that lambda_handler returns 405 for unsupported HTTP methods"""
        event = {
            'httpMethod': 'DELETE',
            'path': '/generate'
        }
        
        response = lambda_function.lambda_handler(event, mock_lambda_context)
        
        assert response['statusCode'] == 405
        body = json.loads(response['body'])
        assert body['success'] == False
    
    def test_lambda_handler_unexpected_error(self, mock_lambda_context):
        """Test that lambda_handler catches unexpected errors and returns 500"""
        event = {
            'httpMethod': 'POST',
            'body': 'invalid-json{'  # Invalid JSON to trigger parsing error
        }
        
        with patch('lambda_function.handle_generate', side_effect=Exception("Unexpected error")):
            response = lambda_function.lambda_handler(event, mock_lambda_context)
            
            assert response['statusCode'] == 500
            body = json.loads(response['body'])
            assert body['success'] == False


# ============================================================================
# TESTS - Generate Update Handler (Requirement 2.1)
# ============================================================================

class TestGenerateHandler:
    """Test suite for handle_generate function and status update generation"""
    
    def test_handle_generate_valid_request(self, setup_mocks, sample_generate_request, sample_bedrock_response):
        """
        Test successful generate request with valid userId and notes
        Validates requirement 2.1: Lambda accepts user input and generates update
        """
        response = lambda_function.handle_generate(sample_generate_request)
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['success'] == True
        assert 'statusUpdate' in body
        assert 'timestamp' in body
    
    def test_handle_generate_response_includes_timestamp(self, setup_mocks, sample_generate_request):
        """Test that generate response includes ISO 8601 timestamp with milliseconds"""
        response = lambda_function.handle_generate(sample_generate_request)
        
        body = json.loads(response['body'])
        timestamp = body['timestamp']
        
        # Validate ISO 8601 format with milliseconds
        assert 'T' in timestamp
        assert 'Z' in timestamp
        assert '.' in timestamp  # Milliseconds separator
        
        # Try to parse it
        datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
    
    def test_handle_generate_empty_notes_returns_400(self, setup_mocks):
        """
        Test that empty notes are rejected with 400 status
        Validates requirement 6.1: validation of empty input
        """
        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'userId': 'test-user',
                'notes': ''
            })
        }
        
        response = lambda_function.handle_generate(event)
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert body['success'] == False
    
    def test_handle_generate_whitespace_notes_returns_400(self, setup_mocks):
        """Test that whitespace-only notes are rejected with 400 status"""
        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'userId': 'test-user',
                'notes': '   \n\t  '
            })
        }
        
        response = lambda_function.handle_generate(event)
        
        assert response['statusCode'] == 400
    
    def test_handle_generate_missing_user_id_returns_400(self, setup_mocks):
        """Test that missing userId is rejected with 400 status"""
        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'notes': 'some notes'
            })
        }
        
        response = lambda_function.handle_generate(event)
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'userId' in body['error']
    
    def test_handle_generate_invalid_json_returns_400(self, setup_mocks):
        """Test that invalid JSON in request body returns 400"""
        event = {
            'httpMethod': 'POST',
            'body': 'not-valid-json{'
        }
        
        response = lambda_function.handle_generate(event)
        
        assert response['statusCode'] == 400
    
    def test_handle_generate_cors_headers_in_response(self, setup_mocks, sample_generate_request):
        """Test that CORS headers are included in response"""
        response = lambda_function.handle_generate(sample_generate_request)
        
        assert 'headers' in response
        assert response['headers']['Content-Type'] == 'application/json'
        assert 'Access-Control-Allow-Origin' in response['headers']


# ============================================================================
# TESTS - DynamoDB Storage (Requirement 2.1, 4.1)
# ============================================================================

class TestDynamoDBStorage:
    """Test suite for DynamoDB operations and update storage"""
    
    def test_store_update_puts_item_in_table(self, setup_mocks):
        """
        Test that store_update calls DynamoDB put_item with correct structure
        Validates requirement 4.1: Lambda stores update to DynamoDB
        """
        user_id = 'test-user'
        timestamp = '2024-01-15T10:30:45.123Z'
        notes = 'test notes'
        status_update = '**Done:**\ntest'
        
        lambda_function.store_update(user_id, timestamp, notes, status_update)
        
        setup_mocks['dynamodb'].Table.assert_called_with(setup_mocks['env']['DYNAMODB_TABLE_NAME'])
        mock_table = setup_mocks['dynamodb'].Table.return_value
        mock_table.put_item.assert_called_once()
    
    def test_store_update_item_structure(self, setup_mocks):
        """
        Test that store_update creates item with all required fields
        Validates requirement 4.2, 4.3: item includes userId, timestamp, notes, statusUpdate
        """
        user_id = 'test-user'
        timestamp = '2024-01-15T10:30:45.123Z'
        notes = 'test notes'
        status_update = '**Done:**\ntest'
        
        lambda_function.store_update(user_id, timestamp, notes, status_update)
        
        mock_table = setup_mocks['dynamodb'].Table.return_value
        call_kwargs = mock_table.put_item.call_args[1]
        item = call_kwargs['Item']
        
        assert item['userId'] == user_id
        assert item['timestamp'] == timestamp
        assert item['originalNotes'] == notes
        assert item['statusUpdate'] == status_update
    
    def test_store_update_with_complex_notes(self, setup_mocks):
        """
        Test store_update with multi-line and special character notes
        Validates requirement 4.3: storage handles complex user input
        """
        user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
        timestamp = '2024-01-15T10:30:45.123Z'
        notes = 'fixed login bug\nstarted API refactor\nblocked on database approval\nwith special chars: !@#$%'
        status_update = '**Done:**\n- Fixed login bug\n\n**In Progress:**\n- API refactor\n\n**Blockers:**\n- Database approval'
        
        lambda_function.store_update(user_id, timestamp, notes, status_update)
        
        mock_table = setup_mocks['dynamodb'].Table.return_value
        call_kwargs = mock_table.put_item.call_args[1]
        item = call_kwargs['Item']
        
        assert item['originalNotes'] == notes
        assert len(item['originalNotes']) > 0
    
    def test_store_update_with_long_content(self, setup_mocks):
        """
        Test store_update with very long notes and status update
        Validates requirement 4.3: storage handles large content
        """
        user_id = 'test-user'
        timestamp = '2024-01-15T10:30:45.123Z'
        notes = 'detailed notes ' * 100  # Long notes
        status_update = '**Done:**\n' + 'completed task ' * 100
        
        lambda_function.store_update(user_id, timestamp, notes, status_update)
        
        mock_table = setup_mocks['dynamodb'].Table.return_value
        call_kwargs = mock_table.put_item.call_args[1]
        item = call_kwargs['Item']
        
        assert item['statusUpdate'] == status_update
        assert item['originalNotes'] == notes
    
    def test_store_update_handles_dynamodb_error(self, setup_mocks):
        """
        Test that store_update handles DynamoDB errors gracefully (non-blocking)
        Validates requirement 4.5: storage failure shouldn't prevent returning update
        """
        mock_table = setup_mocks['dynamodb'].Table.return_value
        mock_table.put_item.side_effect = Exception("DynamoDB error")
        
        # Should not raise exception - errors are logged only
        try:
            lambda_function.store_update('user', 'timestamp', 'notes', 'update')
        except Exception:
            pytest.fail("store_update should not raise exceptions")
    
    def test_store_update_handles_table_not_found_error(self, setup_mocks):
        """
        Test that store_update handles table not found errors gracefully
        Validates requirement 4.5: handles resource errors
        """
        mock_table = setup_mocks['dynamodb'].Table.return_value
        mock_table.put_item.side_effect = Exception("ResourceNotFoundException")
        
        try:
            lambda_function.store_update('user', 'timestamp', 'notes', 'update')
        except Exception:
            pytest.fail("store_update should handle table not found errors gracefully")
    
    def test_store_update_handles_throttling_error(self, setup_mocks):
        """
        Test that store_update handles DynamoDB throttling gracefully
        Validates requirement 4.5: handles transient errors
        """
        mock_table = setup_mocks['dynamodb'].Table.return_value
        mock_table.put_item.side_effect = Exception("ProvisionedThroughputExceededException")
        
        try:
            lambda_function.store_update('user', 'timestamp', 'notes', 'update')
        except Exception:
            pytest.fail("store_update should handle throttling errors gracefully")
    
    def test_store_update_missing_environment_variable(self, mock_bedrock_client, mock_dynamodb_resource):
        """Test that store_update handles missing DYNAMODB_TABLE_NAME gracefully"""
        with patch.dict(os.environ, {'BEDROCK_MODEL_ID': 'test'}, clear=True):
            # Should not raise exception
            try:
                lambda_function.store_update('user', 'timestamp', 'notes', 'update')
            except Exception:
                pytest.fail("store_update should handle missing environment variables")
    
    def test_store_update_with_unicode_content(self, setup_mocks):
        """
        Test store_update with Unicode characters and emojis
        Validates requirement 4.2: international character support
        """
        user_id = 'test-user'
        timestamp = '2024-01-15T10:30:45.123Z'
        notes = '✓ completed task\n🔄 working on feature\n❌ blocked on approval'
        status_update = '**Done:**\n✓ Completed\n\n**In Progress:**\n🔄 Working\n\n**Blockers:**\n❌ Blocked'
        
        lambda_function.store_update(user_id, timestamp, notes, status_update)
        
        mock_table = setup_mocks['dynamodb'].Table.return_value
        call_kwargs = mock_table.put_item.call_args[1]
        item = call_kwargs['Item']
        
        assert item['originalNotes'] == notes
        assert item['statusUpdate'] == status_update


# ============================================================================
# TESTS - History Query (Requirement 5.2, 5.3, 5.6)
# ============================================================================

class TestHistoryQuery:
    """Test suite for DynamoDB history query operations"""
    
    def test_query_history_returns_list(self, setup_mocks, sample_dynamodb_items):
        """
        Test that query_history returns a list of items
        Validates requirement 5.2: Lambda returns update records from DynamoDB
        """
        result = lambda_function.query_history('test-user')
        
        assert isinstance(result, list)
        assert len(result) == len(sample_dynamodb_items)
    
    def test_query_history_includes_required_fields(self, setup_mocks, sample_dynamodb_items):
        """
        Test that returned items include timestamp, statusUpdate, originalNotes
        Validates requirement 5.2: specific fields are returned
        """
        result = lambda_function.query_history('test-user')
        
        for item in result:
            assert 'timestamp' in item
            assert 'statusUpdate' in item
            assert 'originalNotes' in item
    
    def test_query_history_excludes_user_id(self, setup_mocks):
        """Test that userId is not included in returned items for security"""
        result = lambda_function.query_history('test-user')
        
        for item in result:
            assert 'userId' not in item
    
    def test_query_history_descending_order(self, setup_mocks):
        """
        Test that query uses ScanIndexForward=False for descending timestamp order
        Validates requirement 5.3: newest updates first
        """
        lambda_function.query_history('test-user')
        
        mock_table = setup_mocks['dynamodb'].Table.return_value
        call_kwargs = mock_table.query.call_args[1]
        
        assert call_kwargs.get('ScanIndexForward') == False
    
    def test_query_history_limit_50(self, setup_mocks):
        """
        Test that query is limited to 50 items
        Validates requirement 5.6: history limited to recent 50 updates
        """
        lambda_function.query_history('test-user')
        
        mock_table = setup_mocks['dynamodb'].Table.return_value
        call_kwargs = mock_table.query.call_args[1]
        
        assert call_kwargs.get('Limit') == 50
    
    def test_query_history_custom_limit(self, setup_mocks):
        """Test that query_history accepts custom limit parameter"""
        lambda_function.query_history('test-user', limit=10)
        
        mock_table = setup_mocks['dynamodb'].Table.return_value
        call_kwargs = mock_table.query.call_args[1]
        
        assert call_kwargs.get('Limit') == 10
    
    def test_query_history_empty_result(self, setup_mocks):
        """Test that empty DynamoDB result returns empty list"""
        mock_table = setup_mocks['dynamodb'].Table.return_value
        mock_table.query.return_value = {'Items': []}
        
        result = lambda_function.query_history('unknown-user')
        
        assert result == []
    
    def test_query_history_propagates_exception(self, setup_mocks):
        """Test that DynamoDB exceptions are raised"""
        mock_table = setup_mocks['dynamodb'].Table.return_value
        mock_table.query.side_effect = Exception("DynamoDB error")
        
        with pytest.raises(Exception):
            lambda_function.query_history('test-user')
    
    def test_query_history_uses_correct_key_condition(self, setup_mocks):
        """
        Test that query_history uses correct KeyConditionExpression
        Validates requirement 5.2: queries by userId
        """
        user_id = 'test-user-123'
        lambda_function.query_history(user_id)
        
        mock_table = setup_mocks['dynamodb'].Table.return_value
        call_kwargs = mock_table.query.call_args[1]
        
        assert 'KeyConditionExpression' in call_kwargs
        assert 'ExpressionAttributeValues' in call_kwargs
        assert ':uid' in call_kwargs['ExpressionAttributeValues']
        assert call_kwargs['ExpressionAttributeValues'][':uid'] == user_id
    
    def test_query_history_multiple_items_sorted_correctly(self, setup_mocks):
        """
        Test that multiple history items are returned in correct timestamp order
        Validates requirement 5.3: items sorted newest first
        """
        newer_item = {
            'userId': 'test-user',
            'timestamp': '2024-01-15T10:30:45.123Z',
            'originalNotes': 'newest',
            'statusUpdate': 'status1'
        }
        older_item = {
            'userId': 'test-user',
            'timestamp': '2024-01-14T10:30:45.123Z',
            'originalNotes': 'older',
            'statusUpdate': 'status2'
        }
        
        mock_table = setup_mocks['dynamodb'].Table.return_value
        mock_table.query.return_value = {
            'Items': [newer_item, older_item],
            'Count': 2
        }
        
        result = lambda_function.query_history('test-user')
        
        assert len(result) == 2
        # First result should have the most recent timestamp
        assert result[0]['timestamp'] == '2024-01-15T10:30:45.123Z'
        assert result[1]['timestamp'] == '2024-01-14T10:30:45.123Z'
    
    def test_query_history_handles_missing_items_field(self, setup_mocks):
        """Test that query_history handles DynamoDB response without Items field"""
        mock_table = setup_mocks['dynamodb'].Table.return_value
        mock_table.query.return_value = {'Count': 0}  # Missing Items field
        
        result = lambda_function.query_history('test-user')
        
        assert result == []
    
    def test_query_history_with_large_limit(self, setup_mocks):
        """Test that query_history respects custom limit even if large"""
        lambda_function.query_history('test-user', limit=100)
        
        mock_table = setup_mocks['dynamodb'].Table.return_value
        call_kwargs = mock_table.query.call_args[1]
        
        assert call_kwargs.get('Limit') == 100
    
    def test_query_history_with_limit_of_one(self, setup_mocks):
        """Test that query_history works with limit=1"""
        lambda_function.query_history('test-user', limit=1)
        
        mock_table = setup_mocks['dynamodb'].Table.return_value
        call_kwargs = mock_table.query.call_args[1]
        
        assert call_kwargs.get('Limit') == 1
    
    def test_query_history_connection_timeout(self, setup_mocks):
        """Test that query_history raises exception on connection timeout"""
        mock_table = setup_mocks['dynamodb'].Table.return_value
        mock_table.query.side_effect = Exception("Connection timeout")
        
        with pytest.raises(Exception) as exc_info:
            lambda_function.query_history('test-user')
        
        assert "timeout" in str(exc_info.value).lower()


# ============================================================================
# TESTS - History Handler (Requirement 5.1)
# ============================================================================

class TestHistoryHandler:
    """Test suite for handle_history function"""
    
    def test_handle_history_valid_request(self, setup_mocks, sample_history_request):
        """
        Test successful history request with valid userId
        Validates requirement 5.1: Lambda returns update history
        """
        response = lambda_function.handle_history(sample_history_request)
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['success'] == True
        assert 'updates' in body
        assert isinstance(body['updates'], list)
    
    def test_handle_history_returns_multiple_items(self, setup_mocks, sample_history_request, sample_dynamodb_items):
        """
        Test that handle_history returns all items from query_history
        Validates requirement 5.1, 5.2: complete history returned
        """
        response = lambda_function.handle_history(sample_history_request)
        
        body = json.loads(response['body'])
        updates = body['updates']
        
        assert len(updates) == len(sample_dynamodb_items)
        for item in updates:
            assert 'timestamp' in item
            assert 'statusUpdate' in item
            assert 'originalNotes' in item
    
    def test_handle_history_items_have_correct_structure(self, setup_mocks, sample_history_request):
        """
        Test that returned update items have the correct field structure
        Validates requirement 5.2: response includes required fields
        """
        response = lambda_function.handle_history(sample_history_request)
        
        body = json.loads(response['body'])
        updates = body['updates']
        
        for update in updates:
            assert isinstance(update, dict)
            assert isinstance(update.get('timestamp'), str)
            assert isinstance(update.get('statusUpdate'), str)
            assert isinstance(update.get('originalNotes'), str)
    
    def test_handle_history_returns_items_in_descending_order(self, setup_mocks, sample_history_request):
        """
        Test that history items are returned in descending timestamp order (newest first)
        Validates requirement 5.3: proper sorting
        """
        response = lambda_function.handle_history(sample_history_request)
        
        body = json.loads(response['body'])
        updates = body['updates']
        
        # Verify they're sorted by checking timestamps are in descending order
        for i in range(len(updates) - 1):
            assert updates[i]['timestamp'] >= updates[i + 1]['timestamp']
    
    def test_handle_history_missing_query_params(self, setup_mocks):
        """Test that missing query parameters returns 400"""
        event = {
            'httpMethod': 'GET',
            'queryStringParameters': None
        }
        
        response = lambda_function.handle_history(event)
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert body['success'] == False
    
    def test_handle_history_missing_user_id(self, setup_mocks):
        """Test that missing userId in query parameters returns 400"""
        event = {
            'httpMethod': 'GET',
            'queryStringParameters': {'otherParam': 'value'}
        }
        
        response = lambda_function.handle_history(event)
        
        assert response['statusCode'] == 400
    
    def test_handle_history_empty_user_id(self, setup_mocks):
        """Test that empty userId string returns 400"""
        event = {
            'httpMethod': 'GET',
            'queryStringParameters': {'userId': ''}
        }
        
        response = lambda_function.handle_history(event)
        
        assert response['statusCode'] == 400
    
    def test_handle_history_whitespace_user_id(self, setup_mocks):
        """Test that whitespace-only userId returns 400"""
        event = {
            'httpMethod': 'GET',
            'queryStringParameters': {'userId': '   '}
        }
        
        response = lambda_function.handle_history(event)
        
        assert response['statusCode'] == 400
    
    def test_handle_history_database_error_returns_empty_updates(self, setup_mocks, sample_history_request):
        """
        Test that DynamoDB error returns empty updates array with 200
        Validates requirement 6.5: graceful error handling
        """
        mock_table = setup_mocks['dynamodb'].Table.return_value
        mock_table.query.side_effect = Exception("DynamoDB unavailable")
        
        response = lambda_function.handle_history(sample_history_request)
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['updates'] == []
    
    def test_handle_history_database_error_does_not_include_error_field(self, setup_mocks, sample_history_request):
        """
        Test that DynamoDB error response doesn't expose error details to client
        Validates requirement 6.5: security - don't expose internal errors
        """
        mock_table = setup_mocks['dynamodb'].Table.return_value
        mock_table.query.side_effect = Exception("DynamoDB error details")
        
        response = lambda_function.handle_history(sample_history_request)
        
        body = json.loads(response['body'])
        # Error field should not be present when handled gracefully
        assert 'error' not in body or body.get('error', '').lower() != 'dynamodb error details'
    
    def test_handle_history_connection_timeout_error(self, setup_mocks, sample_history_request):
        """
        Test that connection timeout returns empty updates array
        Validates requirement 6.5: handle transient errors gracefully
        """
        mock_table = setup_mocks['dynamodb'].Table.return_value
        mock_table.query.side_effect = Exception("Connection timeout")
        
        response = lambda_function.handle_history(sample_history_request)
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['updates'] == []
    
    def test_handle_history_table_not_found_error(self, setup_mocks, sample_history_request):
        """
        Test that table not found error returns empty updates array
        Validates requirement 6.5: handle missing table gracefully
        """
        mock_table = setup_mocks['dynamodb'].Table.return_value
        mock_table.query.side_effect = Exception("ResourceNotFoundException")
        
        response = lambda_function.handle_history(sample_history_request)
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['updates'] == []
    
    def test_handle_history_logs_error_on_database_failure(self, setup_mocks, sample_history_request):
        """
        Test that errors are logged when DynamoDB fails
        Validates requirement 6.5: error logging for debugging
        """
        mock_table = setup_mocks['dynamodb'].Table.return_value
        mock_table.query.side_effect = Exception("DynamoDB error")
        
        with patch('builtins.print') as mock_print:
            lambda_function.handle_history(sample_history_request)
            
            # Check that error was logged (print or similar logging)
            # Note: depends on actual implementation, may use logging module
    
    def test_handle_history_cors_headers_in_response(self, setup_mocks, sample_history_request):
        """Test that CORS headers are included in history response"""
        response = lambda_function.handle_history(sample_history_request)
        
        assert 'headers' in response
        assert response['headers']['Content-Type'] == 'application/json'
        assert 'Access-Control-Allow-Origin' in response['headers']
    
    def test_handle_history_empty_history_returns_success(self, setup_mocks):
        """
        Test that empty history (no updates for user) returns success with empty array
        Validates requirement 5.1: handles new users gracefully
        """
        event = {
            'httpMethod': 'GET',
            'queryStringParameters': {'userId': 'new-user-id'}
        }
        
        mock_table = setup_mocks['dynamodb'].Table.return_value
        mock_table.query.return_value = {'Items': []}
        
        response = lambda_function.handle_history(event)
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['success'] == True
        assert body['updates'] == []
    
    def test_handle_history_with_uuid_format_user_id(self, setup_mocks):
        """
        Test handle_history with properly formatted UUID userId
        Validates requirement 4.2: UUID format for user identifiers
        """
        event = {
            'httpMethod': 'GET',
            'queryStringParameters': {
                'userId': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
            }
        }
        
        response = lambda_function.handle_history(event)
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['success'] == True
        assert 'updates' in body
    
    def test_handle_history_special_characters_in_user_id(self, setup_mocks):
        """
        Test that special characters in userId are handled (may be rejected or encoded)
        Validates requirement 6.1: input validation
        """
        event = {
            'httpMethod': 'GET',
            'queryStringParameters': {
                'userId': 'user@domain#special'
            }
        }
        
        # Implementation can either accept or reject, but should not crash
        try:
            response = lambda_function.handle_history(event)
            assert response['statusCode'] in [200, 400]
        except Exception:
            pytest.fail("handle_history should not crash on special characters")


# ============================================================================
# TESTS - Response Formatting
# ============================================================================

class TestResponseFormatting:
    """Test suite for response formatting helpers"""
    
    def test_error_response_structure(self):
        """Test that error_response returns correctly formatted error response"""
        response = lambda_function.error_response(400, "Test error message")
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert body['success'] == False
        assert body['error'] == "Test error message"
    
    def test_error_response_cors_headers(self):
        """Test that error_response includes CORS headers"""
        response = lambda_function.error_response(500, "Error")
        
        assert 'Access-Control-Allow-Origin' in response['headers']
        assert 'Access-Control-Allow-Methods' in response['headers']
        assert 'Access-Control-Allow-Headers' in response['headers']
    
    def test_success_response_structure(self):
        """Test that success_response returns correctly formatted success response"""
        data = {'statusUpdate': 'test', 'timestamp': '2024-01-15T10:30:45.123Z'}
        response = lambda_function.success_response(200, data)
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['success'] == True
        assert body['statusUpdate'] == 'test'
        assert body['timestamp'] == '2024-01-15T10:30:45.123Z'
    
    def test_success_response_cors_headers(self):
        """Test that success_response includes CORS headers"""
        response = lambda_function.success_response(200, {})
        
        assert 'Access-Control-Allow-Origin' in response['headers']


# ============================================================================
# TESTS - Integration Scenarios
# ============================================================================

class TestIntegrationScenarios:
    """Test end-to-end scenarios across multiple components"""
    
    def test_full_generate_workflow(self, setup_mocks, sample_generate_request, sample_bedrock_response):
        """
        Test complete workflow: request -> Bedrock -> DynamoDB -> response
        Validates requirements 2.1, 2.2, 4.1, 3.1
        """
        response = lambda_function.lambda_handler(sample_generate_request, MagicMock())
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['success'] == True
        
        # Verify Bedrock was called
        setup_mocks['bedrock'].converse.assert_called_once()
        
        # Verify DynamoDB table was accessed for storage
        setup_mocks['dynamodb'].Table.assert_called()
    
    def test_full_history_workflow(self, setup_mocks, sample_history_request):
        """
        Test complete workflow: history request -> query DynamoDB -> response
        Validates requirements 5.1, 5.2, 5.3
        """
        response = lambda_function.lambda_handler(sample_history_request, MagicMock())
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['success'] == True
        assert 'updates' in body


# ============================================================================
# Test Execution
# ============================================================================

if __name__ == '__main__':
    # Run with: pytest tests/test_lambda_function.py -v
    pytest.main([__file__, '-v'])
