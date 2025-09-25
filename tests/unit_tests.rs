#[cfg(test)]
mod tests {
    use chrono::{DateTime, Utc};
    use serde_json::json;

    #[test]
    fn test_basic_functionality() {
        // Test basic date parsing
        let date_str = "2023-05-15T10:30:00Z";
        let date: DateTime<Utc> = date_str.parse().unwrap();
        assert_eq!(date.format("%Y-%m-%d").to_string(), "2023-05-15");
    }

    #[test]
    fn test_json_serialization() {
        let test_data = json!({
            "topic": "Test Topic",
            "depth": 3
        });

        assert_eq!(test_data["topic"], "Test Topic");
        assert_eq!(test_data["depth"], 3);
    }

    #[test]
    fn test_string_operations() {
        let test_string = "Cybersecurity Research";
        assert_eq!(test_string.len(), 22);
        assert!(test_string.contains("security"));
    }
}