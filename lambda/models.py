"""
Data models for StandupDrafter Lambda function
Provides validated request/response data structures and DynamoDB conversions
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any, Tuple


@dataclass
class GenerateRequest:
    """
    Request data model for status update generation
    
    Represents the data sent to the /generate endpoint. Includes validation
    to ensure required fields are present and valid before processing.
    
    Attributes:
        user_id: Unique identifier for the user (required)
        notes: Raw, unformatted work notes (required, non-empty)
    """
    user_id: str
    notes: str
    
    def validate(self) -> Tuple[bool, Optional[str]]:
        """
        Validate that all required fields are present and non-empty
        
        Checks:
        - user_id is not empty or whitespace-only
        - notes is not empty or whitespace-only
        
        Returns:
            Tuple of (is_valid: bool, error_message: Optional[str])
            - If valid: (True, None)
            - If invalid: (False, descriptive error message)
            
        Examples:
            >>> req = GenerateRequest("user123", "fixed bug")
            >>> req.validate()
            (True, None)
            
            >>> req = GenerateRequest("", "fixed bug")
            >>> req.validate()
            (False, "userId is required")
            
            >>> req = GenerateRequest("user123", "  ")
            >>> req.validate()
            (False, "notes cannot be empty")
        """
        # Validate user_id is not empty
        if not self.user_id or not self.user_id.strip():
            return False, "userId is required"
        
        # Validate notes is not empty
        if not self.notes or not self.notes.strip():
            return False, "notes cannot be empty"
        
        # All validations passed
        return True, None


@dataclass
class UpdateRecord:
    """
    Record of a generated status update stored in DynamoDB
    
    Represents a complete update record with all metadata needed for
    storage and retrieval from DynamoDB.
    
    Attributes:
        user_id: User identifier (DynamoDB partition key)
        timestamp: ISO 8601 timestamp with milliseconds (DynamoDB sort key)
        original_notes: The raw user notes that were processed
        status_update: The AI-generated formatted status update
    """
    user_id: str
    timestamp: str
    original_notes: str
    status_update: str
    
    def to_dynamodb_item(self) -> Dict[str, str]:
        """
        Convert UpdateRecord to DynamoDB item format
        
        Transforms the dataclass into the dictionary format expected by
        boto3's DynamoDB put_item() method. Maps snake_case field names
        to camelCase DynamoDB attribute names.
        
        Returns:
            Dictionary with keys matching DynamoDB schema:
            - userId: User identifier (partition key)
            - timestamp: ISO 8601 timestamp (sort key)
            - originalNotes: Original user input
            - statusUpdate: Generated status update
            
        Examples:
            >>> record = UpdateRecord(
            ...     user_id="user123",
            ...     timestamp="2024-01-15T10:30:45.123Z",
            ...     original_notes="fixed bug",
            ...     status_update="**Done:**\\n- Fixed bug"
            ... )
            >>> item = record.to_dynamodb_item()
            >>> item['userId']
            'user123'
            >>> item['timestamp']
            '2024-01-15T10:30:45.123Z'
        """
        return {
            'userId': self.user_id,
            'timestamp': self.timestamp,
            'originalNotes': self.original_notes,
            'statusUpdate': self.status_update
        }
    
    @staticmethod
    def from_dynamodb_item(item: Dict[str, Any]) -> 'UpdateRecord':
        """
        Create UpdateRecord from DynamoDB item format
        
        Converts a dictionary returned from DynamoDB query/scan into an
        UpdateRecord dataclass instance. Maps camelCase DynamoDB attribute
        names back to snake_case field names.
        
        Args:
            item: Dictionary with DynamoDB item attributes:
                - userId: User identifier
                - timestamp: ISO 8601 timestamp
                - originalNotes: Original user input
                - statusUpdate: Generated status update
        
        Returns:
            UpdateRecord instance with data from DynamoDB item
            
        Raises:
            KeyError: If required DynamoDB attributes are missing
            
        Examples:
            >>> item = {
            ...     'userId': 'user123',
            ...     'timestamp': '2024-01-15T10:30:45.123Z',
            ...     'originalNotes': 'fixed bug',
            ...     'statusUpdate': '**Done:**\\n- Fixed bug'
            ... }
            >>> record = UpdateRecord.from_dynamodb_item(item)
            >>> record.user_id
            'user123'
            >>> record.original_notes
            'fixed bug'
        """
        return UpdateRecord(
            user_id=item['userId'],
            timestamp=item['timestamp'],
            original_notes=item['originalNotes'],
            status_update=item['statusUpdate']
        )
