#!/usr/bin/env python3
"""
Tests for query_history() function in lambda_function.py
Validates requirements 5.2, 5.3, 5.6
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

# We need the real Key class for condition expression tests
from unittest.mock import call

# Add lambda directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lambda'))

# Re-import with patching to avoid boto3 initialization issues
import importlib
import lambda_function
importlib.reload(lambda_function)

from lambda_function import query_history, handle_history


def test_query_history_returns_list():
    """Test that query_history returns a list of items (Req 5.2)"""
    mock_table = MagicMock()
    mock_table.query.return_value = {
        'Items': [
            {
                'userId': 'test-user',
                'timestamp': '2024-01-15T10:30:45.123Z',
                'statusUpdate': '**Done:**\n- Task A',
                'originalNotes': 'task a'
            }
        ]
    }

    with patch.dict(os.environ, {'DYNAMODB_TABLE_NAME': 'test-table'}), \
         patch('lambda_function.dynamodb') as mock_dynamodb:
        mock_dynamodb.Table.return_value = mock_table

        result = query_history('test-user')

        assert isinstance(result, list), "query_history should return a list"
        assert len(result) == 1, "Should return one item"
        print("✓ Test passed: query_history returns a list")


def test_query_history_returns_required_fields():
    """Test that returned items contain timestamp, statusUpdate, originalNotes (Req 5.2)"""
    mock_table = MagicMock()
    mock_table.query.return_value = {
        'Items': [
            {
                'userId': 'test-user',
                'timestamp': '2024-01-15T10:30:45.123Z',
                'statusUpdate': '**Done:**\n- Task A\n\n**Blockers:**\n- None',
                'originalNotes': 'completed task a'
            }
        ]
    }

    with patch.dict(os.environ, {'DYNAMODB_TABLE_NAME': 'test-table'}), \
         patch('lambda_function.dynamodb') as mock_dynamodb:
        mock_dynamodb.Table.return_value = mock_table

        result = query_history('test-user')

        assert len(result) == 1
        item = result[0]

        assert 'timestamp' in item, "Item should contain 'timestamp'"
        assert 'statusUpdate' in item, "Item should contain 'statusUpdate'"
        assert 'originalNotes' in item, "Item should contain 'originalNotes'"

        assert item['timestamp'] == '2024-01-15T10:30:45.123Z'
        assert item['statusUpdate'] == '**Done:**\n- Task A\n\n**Blockers:**\n- None'
        assert item['originalNotes'] == 'completed task a'
        print("✓ Test passed: returned items have required fields (timestamp, statusUpdate, originalNotes)")


def test_query_history_excludes_user_id():
    """Test that userId is not included in returned items (only return specified fields)"""
    mock_table = MagicMock()
    mock_table.query.return_value = {
        'Items': [
            {
                'userId': 'test-user',
                'timestamp': '2024-01-15T10:30:45.123Z',
                'statusUpdate': '**Done:**\n- Task',
                'originalNotes': 'task notes'
            }
        ]
    }

    with patch.dict(os.environ, {'DYNAMODB_TABLE_NAME': 'test-table'}), \
         patch('lambda_function.dynamodb') as mock_dynamodb:
        mock_dynamodb.Table.return_value = mock_table

        result = query_history('test-user')

        assert len(result) == 1
        item = result[0]
        assert 'userId' not in item, "userId should not be in returned items"
        print("✓ Test passed: returned items do not include userId")


def test_query_history_scan_index_forward_false():
    """Test that ScanIndexForward=False is used for descending order (Req 5.3)"""
    mock_table = MagicMock()
    mock_table.query.return_value = {'Items': []}

    with patch.dict(os.environ, {'DYNAMODB_TABLE_NAME': 'test-table'}), \
         patch('lambda_function.dynamodb') as mock_dynamodb:
        mock_dynamodb.Table.return_value = mock_table

        query_history('test-user')

        # Verify ScanIndexForward=False was passed
        call_kwargs = mock_table.query.call_args[1]
        assert call_kwargs.get('ScanIndexForward') == False, \
            "ScanIndexForward should be False for descending timestamp order"
        print("✓ Test passed: ScanIndexForward=False for descending order")


def test_query_history_limit_50():
    """Test that query is limited to 50 items (Req 5.6)"""
    mock_table = MagicMock()
    mock_table.query.return_value = {'Items': []}

    with patch.dict(os.environ, {'DYNAMODB_TABLE_NAME': 'test-table'}), \
         patch('lambda_function.dynamodb') as mock_dynamodb:
        mock_dynamodb.Table.return_value = mock_table

        query_history('test-user')

        # Verify Limit=50 was passed
        call_kwargs = mock_table.query.call_args[1]
        assert call_kwargs.get('Limit') == 50, "Limit should be 50"
        print("✓ Test passed: query limited to 50 items")


def test_query_history_custom_limit():
    """Test that custom limit can be specified"""
    mock_table = MagicMock()
    mock_table.query.return_value = {'Items': []}

    with patch.dict(os.environ, {'DYNAMODB_TABLE_NAME': 'test-table'}), \
         patch('lambda_function.dynamodb') as mock_dynamodb:
        mock_dynamodb.Table.return_value = mock_table

        query_history('test-user', limit=10)

        call_kwargs = mock_table.query.call_args[1]
        assert call_kwargs.get('Limit') == 10, "Custom limit should be respected"
        print("✓ Test passed: custom limit is respected")


def test_query_history_empty_result():
    """Test that empty DynamoDB result returns empty list"""
    mock_table = MagicMock()
    mock_table.query.return_value = {'Items': []}

    with patch.dict(os.environ, {'DYNAMODB_TABLE_NAME': 'test-table'}), \
         patch('lambda_function.dynamodb') as mock_dynamodb:
        mock_dynamodb.Table.return_value = mock_table

        result = query_history('unknown-user')

        assert result == [], "Empty DynamoDB result should return empty list"
        print("✓ Test passed: empty DynamoDB result returns empty list")


def test_query_history_propagates_exception():
    """Test that DynamoDB exceptions are raised (not swallowed)"""
    mock_table = MagicMock()
    mock_table.query.side_effect = Exception("DynamoDB connection error")

    with patch.dict(os.environ, {'DYNAMODB_TABLE_NAME': 'test-table'}), \
         patch('lambda_function.dynamodb') as mock_dynamodb:
        mock_dynamodb.Table.return_value = mock_table

        try:
            query_history('test-user')
            assert False, "Should have raised an exception"
        except Exception as e:
            assert 'DynamoDB connection error' in str(e)
        print("✓ Test passed: DynamoDB exceptions are propagated")


def test_handle_history_missing_query_params():
    """Test that missing query params returns 400"""
    event = {
        'httpMethod': 'GET',
        'queryStringParameters': None
    }

    response = handle_history(event)

    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert body['success'] == False
    print("✓ Test passed: missing query params returns 400")


def test_handle_history_missing_user_id():
    """Test that missing userId in query params returns 400"""
    event = {
        'httpMethod': 'GET',
        'queryStringParameters': {'otherParam': 'value'}
    }

    response = handle_history(event)

    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert body['success'] == False
    assert 'userId' in body['error']
    print("✓ Test passed: missing userId in query params returns 400")


def test_handle_history_success():
    """Test successful history retrieval returns 200 with updates array"""
    mock_table = MagicMock()
    mock_table.query.return_value = {
        'Items': [
            {
                'userId': 'test-user',
                'timestamp': '2024-01-15T10:30:45.123Z',
                'statusUpdate': '**Done:**\n- Task A',
                'originalNotes': 'task a'
            }
        ]
    }

    event = {
        'httpMethod': 'GET',
        'queryStringParameters': {'userId': 'test-user'}
    }

    with patch.dict(os.environ, {'DYNAMODB_TABLE_NAME': 'test-table'}), \
         patch('lambda_function.dynamodb') as mock_dynamodb:
        mock_dynamodb.Table.return_value = mock_table

        response = handle_history(event)

        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['success'] == True
        assert 'updates' in body
        assert len(body['updates']) == 1
        assert body['updates'][0]['timestamp'] == '2024-01-15T10:30:45.123Z'
        print("✓ Test passed: successful history retrieval returns 200 with updates array")


def test_handle_history_db_error_returns_empty_array():
    """Test that DynamoDB error in handle_history returns empty array with 200 (Req 6.5)"""
    mock_table = MagicMock()
    mock_table.query.side_effect = Exception("DynamoDB unavailable")

    event = {
        'httpMethod': 'GET',
        'queryStringParameters': {'userId': 'test-user'}
    }

    with patch.dict(os.environ, {'DYNAMODB_TABLE_NAME': 'test-table'}), \
         patch('lambda_function.dynamodb') as mock_dynamodb:
        mock_dynamodb.Table.return_value = mock_table

        response = handle_history(event)

        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['updates'] == [], "DynamoDB error should return empty updates array"
        print("✓ Test passed: DynamoDB error returns empty array with 200")


def run_all_tests():
    """Run all tests and report results"""
    tests = [
        test_query_history_returns_list,
        test_query_history_returns_required_fields,
        test_query_history_excludes_user_id,
        test_query_history_scan_index_forward_false,
        test_query_history_limit_50,
        test_query_history_custom_limit,
        test_query_history_empty_result,
        test_query_history_propagates_exception,
        test_handle_history_missing_query_params,
        test_handle_history_missing_user_id,
        test_handle_history_success,
        test_handle_history_db_error_returns_empty_array,
    ]

    print("Running query_history() tests...\n")

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
            print(f"  Exception: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print(f"\n{'='*60}")
    print(f"Results: {passed} passed, {failed} failed out of {passed + failed} tests")
    print(f"{'='*60}")

    return failed == 0


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
