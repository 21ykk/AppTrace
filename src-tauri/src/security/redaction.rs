pub fn redact_command_line(cmd: &[String]) -> Vec<String> {
    cmd.iter()
        .map(|arg| {
            let lower = arg.to_lowercase();
            if lower.contains("pass")
                || lower.contains("token")
                || lower.contains("secret")
                || lower.contains("key")
                || lower.contains("auth")
            {
                if let Some(idx) = arg.find('=') {
                    format!("{}[REDACTED]", &arg[..=idx])
                } else {
                    "[REDACTED]".to_string()
                }
            } else {
                arg.clone()
            }
        })
        .collect()
}

pub fn is_sensitive_path(path_str: &str) -> bool {
    let lower = path_str.to_lowercase();
    lower.contains(".ssh")
        || lower.contains(".gnupg")
        || lower.contains(".aws")
        || lower.contains("cookies")
        || lower.contains("keychain")
        || lower.contains("credentials")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_redact_sensitive_command_line_parameters() {
        let input = vec![
            "myapp.exe".to_string(),
            "--port=8080".to_string(),
            "--password=supersecretpassword123".to_string(),
            "--bearer-token=xyzABC987".to_string(),
            "--secret".to_string(),
            "my_key".to_string(),
            "--verbose".to_string(),
        ];

        let redacted = redact_command_line(&input);
        assert_eq!(redacted[0], "myapp.exe");
        assert_eq!(redacted[1], "--port=8080");
        assert_eq!(redacted[2], "--password=[REDACTED]");
        assert_eq!(redacted[3], "--bearer-token=[REDACTED]");
        assert_eq!(redacted[4], "[REDACTED]");
        assert_eq!(redacted[5], "[REDACTED]");
        assert_eq!(redacted[6], "--verbose");
    }

    #[test]
    fn test_detect_sensitive_paths() {
        assert!(is_sensitive_path("C:\\Users\\alice\\.ssh\\id_ed25519"));
        assert!(is_sensitive_path("/home/bob/.gnupg/secring.gpg"));
        assert!(is_sensitive_path("/home/bob/.aws/credentials"));
        assert!(is_sensitive_path("C:\\AppData\\Chrome\\Cookies"));
        assert!(!is_sensitive_path("C:\\Projects\\AppTrace\\src\\main.rs"));
        assert!(!is_sensitive_path("/var/log/syslog"));
    }
}
