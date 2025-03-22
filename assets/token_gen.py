import jwt
import datetime

SECRET_KEY = "sk_test_xzKbtHBEb1kXCVwljCmiH7DFsGMxtt0YjwBBIaEGvC"  # Replace with your actual secret
payload = {
    "sub": "user_123",
    "iat": datetime.datetime.utcnow(),
    "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
    "role": "admin"
}
token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
print(token)
