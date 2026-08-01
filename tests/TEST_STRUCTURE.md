# Lambda Function Test Suite Documentation

## Overview

The `test_lambda_function.py` file provides comprehensive test coverage for the StandupDrafter Lambda function. This document describes the test structure, fixtures, and how to run the tests.

## File Location

```
tests/test_lambda_function.py
```

## Test Framework

- **Framework**: pytest
- **Mocking**: unittest.mock (MagicMock, patch)
- **Python Version**: 3.12+

## Installation

To run the tests, you need to install pytest:

```bash
pip install pytest
```

## Test Fixtures

The test file provides the following fixtures for test reuse:

### Context and Event Fixtures

- **`mock_lambda_context()`**: Mock AWS Lambda context object with standard properties
- **`sample_generate_request()`**: Sample POST /generate request with userId and notes
- **`sample_history_request()`**: Sample GET /history request with userId query parameter

### Response and Data Fixtures

- **`sample_bedrock_response()`**: Bedrock converse() API response with formatted status update
- **`sample_dynamodb_items()`**: Sample DynamoDB update records from history query

### Mock Service Fixtures

- **`mock_bedrock_client()`**: Mocked boto3 Bedrock Runtime client
- **`mock_dynamodb_resource()`**: Mocked boto3 DynamoDB resource with table operations
- **`environment_variables()`**: Mock AWS environment variables (table name, model ID, region)
- **`setup_mocks()`**: Combined fixture that patches all services and environment variables

## Test Structure

The test suite is organized into 8 test classes covering different aspects:

### 1. TestBedrockIntegration (Requirement 2.2)

Tests Amazon Bedrock AI integration:
- Prompt construction with three sections (Done, In Progress, Blockers)
- Text extraction from Bedrock response structure
- Bedrock API invocation with correct parameters
- Inference configuration (maxTokens, temperature)

**Tests**:
- `test_construct_prompt_includes_three_sections()`
- `test_construct_prompt_includes_raw_notes()`
- `test_extract_text_from_response_valid_structure()`
- `test_extract_text_from_response_invalid_structure()`
- `test_extract_text_from_response_missing_fields()`
- `test_invoke_bedrock_calls_converse_api()`
- `test_invoke_bedrock_inference_config()`
- `test_invoke_bedrock_returns_status_update()`

### 2. TestLambdaHandler (Requirement 2.1)

Tests Lambda entry point and HTTP method routing:
- POST request routing to handle_generate
- GET request routing to handle_history
- Unsupported HTTP methods (405 response)
- Unexpected error handling

**Tests**:
- `test_lambda_handler_routes_post_requests()`
- `test_lambda_handler_routes_get_requests()`
- `test_lambda_handler_unsupported_method()`
- `test_lambda_handler_unexpected_error()`

### 3. TestGenerateHandler (Requirement 2.1)

Tests generate endpoint request handling:
- Valid request processing
- ISO 8601 timestamp generation
- Input validation (empty/whitespace notes)
- Missing userId validation
- Invalid JSON handling
- CORS headers in response

**Tests**:
- `test_handle_generate_valid_request()`
- `test_handle_generate_response_includes_timestamp()`
- `test_handle_generate_empty_notes_returns_400()`
- `test_handle_generate_whitespace_notes_returns_400()`
- `test_handle_generate_missing_user_id_returns_400()`
- `test_handle_generate_invalid_json_returns_400()`
- `test_handle_generate_cors_headers_in_response()`

### 4. TestDynamoDBStorage (Requirement 4.1)

Tests DynamoDB storage operations:
- Put item operation
- Item structure with userId, timestamp, notes, update
- Error handling (non-blocking)
- Missing environment variables

**Tests**:
- `test_store_update_puts_item_in_table()`
- `test_store_update_item_structure()`
- `test_store_update_handles_dynamodb_error()`
- `test_store_update_missing_environment_variable()`

### 5. TestHistoryQuery (Requirement 5.2, 5.3, 5.6)

Tests DynamoDB history query operations:
- Returns list of items
- Includes required fields (timestamp, statusUpdate, originalNotes)
- Excludes userId from response
- Descending order (ScanIndexForward=False)
- Default limit of 50 items
- Custom limit support
- Empty result handling
- Exception propagation

**Tests**:
- `test_query_history_returns_list()`
- `test_query_history_includes_required_fields()`
- `test_query_history_excludes_user_id()`
- `test_query_history_descending_order()`
- `test_query_history_limit_50()`
- `test_query_history_custom_limit()`
- `test_query_history_empty_result()`
- `test_query_history_propagates_exception()`

### 6. TestHistoryHandler (Requirement 5.1)

Tests history endpoint request handling:
- Valid request processing
- Missing query parameters validation
- Missing userId validation
- DynamoDB error handling (returns empty array)
- CORS headers in response

**Tests**:
- `test_handle_history_valid_request()`
- `test_handle_history_missing_query_params()`
- `test_handle_history_missing_user_id()`
- `test_handle_history_database_error_returns_empty_updates()`
- `test_handle_history_cors_headers_in_response()`

### 7. TestResponseFormatting

Tests response helper functions:
- Error response structure
- Success response structure
- CORS headers in responses

**Tests**:
- `test_error_response_structure()`
- `test_error_response_cors_headers()`
- `test_success_response_structure()`
- `test_success_response_cors_headers()`

### 8. TestIntegrationScenarios

Tests end-to-end workflows:
- Full generate workflow (request → Bedrock → DynamoDB → response)
- Full history workflow (query → DynamoDB → response)

**Tests**:
- `test_full_generate_workflow()`
- `test_full_history_workflow()`

## Running the Tests

### Run all tests

```bash
pytest tests/test_lambda_function.py -v
```

### Run specific test class

```bash
pytest tests/test_lambda_function.py::TestBedrockIntegration -v
```

### Run specific test

```bash
pytest tests/test_lambda_function.py::TestBedrockIntegration::test_construct_prompt_includes_three_sections -v
```

### Run with coverage

```bash
pip install pytest-cov
pytest tests/test_lambda_function.py --cov=lambda --cov-report=html
```

### Run with detailed output

```bash
pytest tests/test_lambda_function.py -v -s
```

## Mock Configuration

The `setup_mocks` fixture patches the following:

1. **boto3.dynamodb**: Mocked DynamoDB resource with table operations
2. **boto3.bedrock-runtime**: Mocked Bedrock client with converse() method
3. **Environment variables**: DYNAMODB_TABLE_NAME, BEDROCK_MODEL_ID, AWS_REGION

All tests in classes that use `setup_mocks` fixture will have mocked AWS services.

## Test Data

### Sample User ID
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Sample Notes
```
fixed login bug, started API refactor, blocked on database migration approval
```

### Sample Timestamp
```
2024-01-15T10:30:45.123Z  (ISO 8601 with milliseconds)
```

### Sample Bedrock Response
Shows three sections: Done, In Progress, Blockers with formatted bullet points.

### Sample DynamoDB Items
Two update records with userId, timestamp, originalNotes, and statusUpdate fields.

## Requirements Coverage

The test suite validates the following requirements:

- **Requirement 2.1**: Lambda accepts HTTP requests and returns formatted responses
- **Requirement 2.2**: Lambda invokes Bedrock service and receives formatted updates
- **Requirement 4.1**: Lambda stores update records in DynamoDB
- **Requirement 5.1**: Lambda retrieves update history from DynamoDB
- **Requirement 5.2**: Query returns items with timestamp, statusUpdate, originalNotes
- **Requirement 5.3**: History sorted by timestamp in descending order
- **Requirement 5.6**: History limited to 50 most recent items

## Next Steps

After the test file structure is created, the following tests should be implemented:

### Task 13.2 - Tests for Bedrock Integration
- Test construct_prompt() format
- Test invoke_bedrock() calls and responses
- Test error handling for timeouts and throttling

### Task 13.3 - Tests for Generate Endpoint
- Test valid request processing
- Test input validation
- Test error responses

### Task 13.4 - Tests for DynamoDB Operations
- Test store_update() with valid data
- Test query_history() with various scenarios
- Test error handling

## Common Issues and Solutions

### ImportError: No module named boto3

**Solution**: The test file mocks boto3 before importing lambda_function, so boto3 doesn't need to be installed to run tests.

### pytest: command not found

**Solution**: Install pytest: `pip install pytest`

### Tests fail with "DYNAMODB_TABLE_NAME not set"

**Solution**: The `setup_mocks` fixture sets environment variables. Make sure your test uses this fixture.

## Best Practices

1. **Use fixtures**: Share setup code between tests using pytest fixtures
2. **Mock external services**: Always mock boto3 clients to avoid AWS calls
3. **Descriptive names**: Use clear test names that describe what is being tested
4. **Arrange-Act-Assert**: Follow AAA pattern in test methods
5. **Test one thing**: Each test should validate a single behavior
6. **Document intent**: Use docstrings to explain what each test validates

## Contributing New Tests

When adding new tests:

1. Identify the component being tested (Bedrock, DynamoDB, Handler, etc.)
2. Add test to appropriate test class
3. Use existing fixtures to reduce setup code
4. Follow naming pattern: `test_<component>_<scenario>_<expected_outcome>`
5. Include docstring describing what requirement is being validated
6. Run full test suite to ensure no regressions
