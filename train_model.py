import pandas as pd
from sklearn.tree import DecisionTreeRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import joblib

data = pd.read_csv("dataset.csv")

X = data[["skills", "projects", "experience", "education_level"]]
y = data["score"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2,random_state=6)

model = DecisionTreeRegressor(max_depth=5, min_samples_split=2)
model.fit(X_train, y_train)

predictions = model.predict(X_test)
error = mean_absolute_error(y_test, predictions)

print("Model trained successfully")
print("Mean Absolute Error:", error)

joblib.dump(model, "model.pkl")