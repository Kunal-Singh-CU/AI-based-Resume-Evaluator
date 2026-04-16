import sys
import joblib

model = joblib.load("model.pkl")

features = list(map(int, sys.argv[1:]))

prediction = model.predict([features])

print(int(prediction[0]))