def send_email(subject: str, body: str, recipients):
    return {
        "subject": subject,
        "body": body,
        "recipients": list(recipients),
    }
