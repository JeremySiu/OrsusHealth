import shap
import pandas as pd
import numpy as np
import joblib
import os

# Load the pre-trained Random Forest model
base_path = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(base_path, '../model/model.joblib')
model = joblib.load(model_path)
explainer = shap.TreeExplainer(model)

# Define the exact feature list used during model training
TRAINED_FEATURES = [
    'Age', 'Sex', 'RestingBP', 'Cholesterol', 'FastingBS', 'MaxHR', 'ExerciseAngina', 'Oldpeak',
    'ChestPainType_ASY', 'ChestPainType_ATA', 'ChestPainType_NAP', 'ChestPainType_TA',
    'RestingECG_LVH', 'RestingECG_Normal', 'RestingECG_ST',
    'ST_Slope_Down', 'ST_Slope_Flat', 'ST_Slope_Up'
]

def predict_heart_disease(json_data):
    # Create a template dictionary with all zeros
    encoded_data = {col: 0 for col in TRAINED_FEATURES}

    # Fill in the numeric values directly
    for field in ['Age', 'RestingBP', 'Cholesterol', 'FastingBS', 'MaxHR', 'Oldpeak']:
        encoded_data[field] = json_data.get(field, 0)

    # Simple Binary Encoding (0 and 1)
    if json_data.get('Sex') == 'M': 
        encoded_data['Sex'] = 1

    if json_data.get('ExerciseAngina') == 'Y': 
        encoded_data['ExerciseAngina'] = 1

    # One-Hot Encoding for multi-class categories
    cp_type = f"ChestPainType_{json_data.get('ChestPainType')}"
    if cp_type in encoded_data: 
        encoded_data[cp_type] = 1

    ecg_type = f"RestingECG_{json_data.get('RestingECG')}"
    if ecg_type in encoded_data: 
        encoded_data[ecg_type] = 1

    slope_type = f"ST_Slope_{json_data.get('ST_Slope')}"
    if slope_type in encoded_data:
        encoded_data[slope_type] = 1

    # Convert to DataFrame and Predict
    # Use [TRAINED_FEATURES] to rearange the columns to match this order
    final_df = pd.DataFrame([encoded_data])[TRAINED_FEATURES]
    
    probability= model.predict_proba(final_df)[0]  
    # Extract the probability for Heart Disease (Class 1)
    heart_disease_pct = probability[1] * 100
    # print(f"Probability of Heart Disease: {heart_disease_pct:.2f}%")

    # ================================================================================= #
    # Top 5 Important Features from the Model (Global Importance)
    # ================================================================================= #
    # # Get importance scores from the model
    # importances = model.feature_importances_
    # feature_names = final_df.columns
    # # Sort them and pick the top 5
    # top_indices = importances.argsort()[-5:][::-1]
    # print("Top 5 Important Features:")
    # for idx in top_indices:
    #     print(f"{feature_names[idx]}: {importances[idx]:.4f}")

    # Get SHAP values for current input (final_df)
    # In Scikit-Learn RF, shap_values is a list: [Class 0, Class 1]
    # Select [1] for the "Heart Disease" class
    shap_values = explainer.shap_values(final_df)
    # print(type(shap_values))
    # print(np.shape(shap_values))
    # Shape: (1, 18, 2) --> (Number of Patients, Number of Features, Number of Classes) 
    instance_shap = shap_values[0, : ,1] 
    # print(np.shape(instance_shap))  # Should be (18,) for 18 features
    
    # Identify the Top 3 contributors by absolute magnitude
    top_3_indices = np.argsort(np.abs(instance_shap))[-3:][::-1]
    feature_names = final_df.columns

    # print("Top 3 SHAP Contributors for this Prediction:")
    shap_details = []
    for i in top_3_indices:
        row = {
            "feature": feature_names[i],
            "shap_value": instance_shap[i]
        }
        shap_details.append(row)
        # print(f"{feature_names[i]}: {instance_shap[i]:.4f}")

    return {
        "heart_disease_probability": round(float(heart_disease_pct), 4),
        "top_influencing_features": shap_details,
        "status": "success"
    }

if __name__ == "__main__":
    # Example raw JSON input
    input_data = {
        "Age": 40,
        "Sex": "M",
        "ChestPainType": "ATA",
        "RestingBP": 140,
        "Cholesterol": 289,
        "FastingBS": 0,
        "RestingECG": "Normal",
        "MaxHR": 172,
        "ExerciseAngina": "N",
        "Oldpeak": 0.0,
        "ST_Slope": "Up"
    }

    # Get result
    result = predict_heart_disease(input_data)
    print(f"Prediction Result: {result}")