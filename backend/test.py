binary_for = bin(9)
print(f"Binary representation of 9 is: {binary_for}")

def display_notification(messages, k):
    """
    Displays a notification message, slicing it at position k if it's longer than k.
    
    :param messages: List of strings forming the message.
    :param k: Maximum length of the notification message.
    """
    full_message = " ".join(messages)  # Join the list into a single string
    if len(full_message) > k:
        return full_message[:k] + "..."  # Slice at k and append "..."
    return full_message

# Example usage<
messages = ["This", "is", "a", "test", "notification", "message"]
k = 20
print(display_notification(messages, k))  # Output: "This is a test noti..."