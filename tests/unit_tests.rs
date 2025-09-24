#[cfg(test)]
mod tests {
    use crate::models::{Job, NewJob};
    use crate::utils;
    use chrono::{DateTime, Utc};
    use serde_json::json;

    #[test]
    fn test_format_indian_date() {
        let date_str = "2023-05-15T10:30:00Z";
        let date: DateTime<Utc> = date_str.parse().unwrap();
        let formatted = utils::format_indian_date(date);
        assert_eq!(formatted, "15-May-2023");
    }

    #[test]
    fn test_validate_citation_format_valid() {
        let citation_json = json!({
            "url": "https://example.com",
            "title": "Example Title",
            "publisher": "Example Publisher",
            "year": 2023
        });
        
        let result = utils::validate_citation_format(&citation_json);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_citation_format_missing_fields() {
        let citation_json = json!({
            "url": "https://example.com",
            "title": "Example Title"
            // Missing publisher and year
        });
        
        let result = utils::validate_citation_format(&citation_json);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_citation_format_with_doi() {
        let citation_json = json!({
            "doi": "10.1000/test",
            "title": "Example Title",
            "publisher": "Example Publisher",
            "year": 2023
        });
        
        let result = utils::validate_citation_format(&citation_json);
        assert!(result.is_ok());
    }

    #[test]
    fn test_deduplicate_citations() {
        use crate::models::Citation;
        use chrono::Utc;

        let citations = vec![
            Citation {
                doi: Some("10.1000/test1".to_string()),
                url: "https://example.com/1".to_string(),
                title: "Test Title 1".to_string(),
                publisher: "Test Publisher".to_string(),
                year: 2023,
                access_date: Utc::now(),
                page_section: Some("p. 10".to_string()),
            },
            Citation {
                doi: Some("10.1000/test2".to_string()),
                url: "https://example.com/2".to_string(),
                title: "Test Title 2".to_string(),
                publisher: "Test Publisher".to_string(),
                year: 2023,
                access_date: Utc::now(),
                page_section: Some("p. 15".to_string()),
            },
            // Duplicate of the first citation
            Citation {
                doi: Some("10.1000/test1".to_string()),
                url: "https://example.com/1".to_string(),
                title: "Test Title 1".to_string(),
                publisher: "Test Publisher".to_string(),
                year: 2023,
                access_date: Utc::now(),
                page_section: Some("p. 10".to_string()),
            },
        ];

        let deduplicated = utils::deduplicate_citations(citations);
        assert_eq!(deduplicated.len(), 2); // Should have removed the duplicate
    }

    #[tokio::test]
    async fn test_job_creation() {
        let new_job = NewJob {
            id: "test-job-123".to_string(),
            topic: "Test Topic".to_string(),
            depth: 3,
            created_at: Utc::now(),
            status: "submitted".to_string(),
        };

        // Just testing that the struct can be created
        assert_eq!(new_job.topic, "Test Topic");
        assert_eq!(new_job.depth, 3);
        assert_eq!(new_job.status, "submitted");
    }
}