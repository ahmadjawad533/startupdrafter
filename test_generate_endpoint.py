#!/usr/bin/env python3
"""
Simple test script for handle_generate function
Tests input validation and response structure
"""

import json
import sys
import os
from unittest.mock import MagicMock, patch

# Mock boto3 before importing lambda_function
boto3_mock = MagicMock()
sys.modules['boto3'] = boto3_mock
sys.modules['boto3.dynamodb'] = MagicMock()
sys.modules['boto3.dynamodb.conditions'] = MagicMock()

# Add lambda directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lambda'))

# Import the lambda function
from lambda_function import handle_generate


def test_missing_user_id():
    """Test that missing userId returns 400 error"""
    event = {
        'httpMethod': 'POST',
        'body': json.dumps({'notes': 'some notes'})
    }
    
    response = handle_generate(event)
    
    assert response['statusCode'] == 400, f"Expected 400, got {response['statusCode']}"
    body = json.loads(response['body'])
    assert body['success'] == False, "Expected success to be False"
    assert 'userId' in body['error'], f"Expected error about userId, got: {body['error']}"
    print("✓ Test passed: missing userId returns 400")


def test_empty_user_id():
    """Test that empty userId returns 400 error"""
    event = {
        'httpMethod': 'POST',
        'body': json.dumps({'userId': '   ', 'notes': 'some notes'})
    }
    
    response = handle_generate(event)
    
    assert response['statusCode'] == 400, f"Expected 400, got {response['statusCode']}"
    body = json.loads(response['body'])
    assert body['success'] == False, "Expected success to be False"
    print("✓ Test passed: empty userId returns 400")


def test_missing_notes():
    """Test that missing notes returns 400 error"""
    event = {
        'httpMethod': 'POST',
        'body': json.dumps({'userId': 'test-user-123'})
    }
    
    response = handle_generate(event)
    
    assert response['statusCode'] == 400, f"Expected 400, got {response['statusCode']}"
    body = json.loads(response['body'])
    assert body['success'] == False, "Expected success to be False"
    assert 'notes' in body['error'].lower(), f"Expected error about notes, got: {body['error']}"
    print("✓ Test passed: missing notes returns 400")


def test_whitespace_only_notes():
    """Test that whitespace-only notes returns 400 error"""
    event = {
        'httpMethod': 'POST',
        'body': json.dumps({'userId': 'test-user-123', 'notes': '   \n\t  '})
    }
    
    response = handle_generate(event)
    
    assert response['statusCode'] == 400, f"Expected 400, got {response['statusCode']}"
    body = json.loads(response['body'])
    assert body['success'] == False, "Expected success to be False"
    assert 'notes' in body['error'].lower(), f"Expected error about notes, got: {body['error']}"
    print("✓ Test passed: whitespace-only notes returns 400")


def test_invalid_json():
    """Test that invalid JSON returns 400 error"""
    event = {
        'httpMethod': 'POST',
        'body': 'not valid json {'
    }
    
    response = handle_generate(event)
    
    assert response['statusCode'] == 400, f"Expected 400, got {response['statusCode']}"
    body = json.loads(response['body'])
    assert body['success'] == False, "Expected success to be False"
    print("✓ Test passed: invalid JSON returns 400")


def test_successful_generation():
    """Test successful update generation with mocked Bedrock"""
    with patch('lambda_function.invoke_bedrock') as mock_bedrock, \
         patch('lambda_function.store_update') as mock_store:
        
        # Mock Bedrock to return formatted update
        mock_bedrock.return_value = "**Done:**\n- Fixed bug\n\n**In Progress:**\n- New feature\n\n**Blockers:**\n- None"
        
        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'userId': 'test-user-123',
                'notes': 'fixed login bug, working on dashboard, no blockers'
            })
        }
        
        response = handle_generate(event)
        
        # Verify response structure
        assert response['statusCode'] == 200, f"Expected 200, got {response['statusCode']}"
        
        body = json.loads(response['body'])
        assert body['success'] == True, "Expected success to be True"
        assert 'statusUpdate' in body, "Expected statusUpdate in response"
        assert 'timestamp' in body, "Expected timestamp in response"
        
        # Verify timestamp format (ISO 8601 with milliseconds)
        timestamp = body['timestamp']
        assert timestamp.endswith('Z'), "Timestamp should end with Z"
        assert 'T' in timestamp, "Timestamp should contain T separator"
        assert timestamp.count('.') == 1, "Timestamp should have milliseconds"
        
        # Verify invoke_bedrock was called
        mock_bedrock.assert_called_once()
        args, _ = mock_bedrock.call_args
        assert args[0] == 'fixed login bug, working on dashboard, no blockers'
        
        # Verify store_update was called
        mock_store.assert_called_once()
        
        print("✓ Test passed: successful generation returns 200 with statusUpdate and timestamp")


def test_cors_headers():
    """Test that CORS headers are present in response"""
    event = {
        'httpMethod': 'POST',
        'body': json.dumps({'notes': 'some notes'})  # Missing userId to trigger error
    }
    
    response = handle_generate(event)
    
    assert 'headers' in response, "Expected headers in response"
    headers = response['headers']
    assert 'Access-Control-Allow-Origin' in headers, "Expected CORS origin header"
    assert headers['Access-Control-Allow-Origin'] == '*', "Expected wildcard CORS origin"
    assert 'Content-Type' in headers, "Expected Content-Type header"
    assert headers['Content-Type'] == 'application/json', "Expected JSON content type"
    
    print("✓ Test passed: CORS headers are present")


def run_all_tests():
    """Run all tests and report results"""
    tests = [
        test_missing_user_id,
        test_empty_user_id,
        test_missing_notes,
        test_whitespace_only_notes,
        test_invalid_json,
        test_successful_generation,
        test_cors_headers
    ]
    
    print("Running handle_generate() tests...\n")
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"✗ Test failed: {test.__name__}")
            print(f"  Error: {e}")
            failed += 1
        except Exception as e:
            print(f"✗ Test error: {test.__name__}")
            print(f"  Exception: {e}")
            failed += 1
    
    print(f"\n{'='*60}")
    print(f"Results: {passed} passed, {failed} failed out of {passed + failed} tests")
    print(f"{'='*60}")
    
    return failed == 0


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
