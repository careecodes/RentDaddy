import jwt

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImlhdCI6MTc0MjQ4NTY2MSwiZXhwIjoxNzQyNDg5MjYxLCJyb2xlIjoiYWRtaW4ifQ.1g0RM5VJcqHWm1D4hcE95Q1LOjr6UsDYeLgFWQqn3XY"

decoded = jwt.decode(token, options={"verify_signature": False})  # Bypass signature check for debugging
print(decoded)
