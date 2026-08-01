"""
Unit tests for StandupDrafter data models
Tests GenerateRequest validation and UpdateRecord DynamoDB conversions
"""

import pytest
from models import GenerateRequest, UpdateRecord


class TestGenerateRequest:
    """Tests for GenerateRequest validation"""
    
    def test_validate_valid_request(self):
        """Valid request should return success"""
        request = GenerateRequest(
            user_id="user-123",
            notes="- fixed login bug\n- started refactoring API"
        )
        is_valid, error = request.validate()
        
        assert is_valid is True
        assert error is None
    
    def test_validate_empty_user_id(self):
        """Empty user_id should fail validation"""
        request = GenerateRequest(
            user_id="",
            notes="some notes"
        )
        is_valid, error = request.validate()
        
        assert is_valid is False
        assert "userId is required" in error
    
    def test_validate_whitespace_only_user_id(self):
        """Whitespace-only user_id should fail validation"""
        request = GenerateRequest(
            user_id="   ",
            notes="some notes"
        )
        is_valid, error = request.validate()
        
        assert is_valid is False
        assert "userId is required" in error
    
    def test_validate_empty_notes(self):
        """Empty notes should fail validation"""
        request = GenerateRequest(
            user_id="user-123",
            notes=""
        )
        is_valid, error = request.validate()
        
        assert is_valid is False
        assert "notes cannot be empty" in error
    
    def test_validate_whitespace_only_notes(self):
        """Whitespace-only notes should fail validation"""
        request = GenerateRequest(
            user_id="user-123",
            notes="   \n  \t  "
        )
        is_valid, error = request.validate()
        
        assert is_valid is False
        assert "notes cannot be empty" in error
    
    def test_validate_multiline_notes(self):
        """Valid multiline notes should pass validation"""
        request = GenerateRequest(
            user_id="user-123",
            notes="- Fixed authentication bug\n- Updated database schema\n- Code review pending"
        )
        is_valid, error = request.validate()
        
        assert is_valid is True
        assert error is None
    
    def test_validate_both_empty(self):
        """When both fields are empty, user_id validation fails first"""
        request = GenerateRequest(
            user_id="",
            notes=""
        )
        is_valid, error = request.validate()
        
        assert is_valid is False
        assert "userId is required" in error


class TestUpdateRecord:
    """Tests for UpdateRecord DynamoDB conversions"""
    
    def test_to_dynamodb_item_basic(self):
        """Convert UpdateRecord to DynamoDB item format"""
        record = UpdateRecord(
            user_id="user-123",
            timestamp="2024-01-15T10:30:45.123Z",
            original_notes="- fixed bug\n- started feature",
            status_update="**Done:**\n- Fixed bug\n\n**In Progress:**\n- Started feature\n\n**Blockers:**\n- None"
        )
        
        item = record.to_dynamodb_item()
        
        # Verify camelCase conversion
        assert item['userId'] == "user-123"
        assert item['timestamp'] == "2024-01-15T10:30:45.123Z"
        assert item['originalNotes'] == "- fixed bug\n- started feature"
        assert item['statusUpdate'] == "**Done:**\n- Fixed bug\n\n**In Progress:**\n- Started feature\n\n**Blockers:**\n- None"
    
    def test_to_dynamodb_item_preserves_content(self):
        """DynamoDB item should preserve all content including special characters"""
        record = UpdateRecord(
            user_id="user@example.com",
            timestamp="2024-12-31T23:59:59.999Z",
            original_notes="Fix: API returns 404 when query has ? or & chars",
            status_update="**Done:**\n- Fixed: API returns 404 when query has ? or & chars"
        )
        
        item = record.to_dynamodb_item()
        
        assert item['userId'] == "user@example.com"
        assert "?" in item['originalNotes']
        assert "&" in item['originalNotes']
    
    def test_from_dynamodb_item_basic(self):
        """Create UpdateRecord from DynamoDB item"""
        item = {
            'userId': 'user-123',
            'timestamp': '2024-01-15T10:30:45.123Z',
            'originalNotes': '- fixed bug',
            'statusUpdate': '**Done:**\n- Fixed bug'
        }
        
        record = UpdateRecord.from_dynamodb_item(item)
        
        assert record.user_id == 'user-123'
        assert record.timestamp == '2024-01-15T10:30:45.123Z'
        assert record.original_notes == '- fixed bug'
        assert record.status_update == '**Done:**\n- Fixed bug'
    
    def test_roundtrip_conversion(self):
        """Converting to and from DynamoDB format should preserve data"""
        original_record = UpdateRecord(
            user_id="user-456",
            timestamp="2024-06-20T14:22:10.500Z",
            original_notes="- task 1\n- task 2\n- task 3",
            status_update="**Done:**\n- Task 1\n- Task 2\n- Task 3\n\n**In Progress:**\n- None\n\n**Blockers:**\n- None"
        )
        
        # Convert to DynamoDB and back
        dynamodb_item = original_record.to_dynamodb_item()
        restored_record = UpdateRecord.from_dynamodb_item(dynamodb_item)
        
        # Verify all fields match
        assert restored_record.user_id == original_record.user_id
        assert restored_record.timestamp == original_record.timestamp
        assert restored_record.original_notes == original_record.original_notes
        assert restored_record.status_update == original_record.status_update
    
    def test_from_dynamodb_item_missing_field(self):
        """Missing required field should raise KeyError"""
        incomplete_item = {
            'userId': 'user-123',
            'timestamp': '2024-01-15T10:30:45.123Z'
            # Missing 'originalNotes' and 'statusUpdate'
        }
        
        with pytest.raises(KeyError):
            UpdateRecord.from_dynamodb_item(incomplete_item)
    
    def test_to_dynamodb_item_returns_dict(self):
        """to_dynamodb_item should return a dictionary"""
        record = UpdateRecord(
            user_id="user-123",
            timestamp="2024-01-15T10:30:45.123Z",
            original_notes="notes",
            status_update="update"
        )
        
        item = record.to_dynamodb_item()
        
        assert isinstance(item, dict)
        assert set(item.keys()) == {'userId', 'timestamp', 'originalNotes', 'statusUpdate'}
    
    def test_from_dynamodb_item_returns_update_record(self):
        """from_dynamodb_item should return an UpdateRecord instance"""
        item = {
            'userId': 'user-123',
            'timestamp': '2024-01-15T10:30:45.123Z',
            'originalNotes': 'notes',
            'statusUpdate': 'update'
        }
        
        record = UpdateRecord.from_dynamodb_item(item)
        
        assert isinstance(record, UpdateRecord)
        assert hasattr(record, 'user_id')
        assert hasattr(record, 'timestamp')
        assert hasattr(record, 'original_notes')
        assert hasattr(record, 'status_update')


class TestUpdateRecordIntegration:
    """Integration tests for UpdateRecord with realistic DynamoDB scenarios"""
    
    def test_real_world_dynamodb_query_result(self):
        """Test with realistic DynamoDB query result format"""
        # Simulate what boto3 returns from a DynamoDB query
        dynamodb_items = [
            {
                'userId': 'user-abc',
                'timestamp': '2024-01-15T14:30:00.000Z',
                'originalNotes': 'Completed standup presentation',
                'statusUpdate': '**Done:**\n- Standup presentation\n\n**In Progress:**\n- None\n\n**Blockers:**\n- None'
            },
            {
                'userId': 'user-abc',
                'timestamp': '2024-01-15T09:15:00.000Z',
                'originalNotes': 'Fixed database connection issue',
                'statusUpdate': '**Done:**\n- Database connection fix\n\n**In Progress:**\n- None\n\n**Blockers:**\n- None'
            }
        ]
        
        records = [UpdateRecord.from_dynamodb_item(item) for item in dynamodb_items]
        
        assert len(records) == 2
        assert records[0].timestamp == '2024-01-15T14:30:00.000Z'
        assert records[1].timestamp == '2024-01-15T09:15:00.000Z'
