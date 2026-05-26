class Api::V1::EhrImportsController < ApplicationController
  def create
    payloads = params[:fhir_payload].is_a?(Array) ? params[:fhir_payload] : [params[:fhir_payload]]
    processed_patients = []
    errors = []

    payloads.each do |single_patient_payload|
      operation_params = {
        hospital_id: params[:hospital_id],
        fhir_payload: single_patient_payload.to_unsafe_h
      }

      result = Ehr::Operation::Process.call(params: operation_params)

      if result.success?
        processed_patients << serialize_document(result[:document])
      else
        errors << "Failed to process a patient record."
      end
    end

    success_count = processed_patients.length
    if errors.empty?
      render json: {
        message: "Successfully processed #{success_count} patient(s)!",
        patients: processed_patients,
        errors: []
      }, status: :created
    else
      render json: {
        message: "Processed #{success_count} patient(s), but encountered #{errors.length} error(s).",
        patients: processed_patients,
        errors: errors
      }, status: :multi_status
    end
  end

  private

  def serialize_document(doc)
    {
      id: doc.id.to_s,
      status: doc.status,
      features: doc.features,
      feature_provenance: doc.feature_provenance,
      heart_disease_probability: doc.heart_disease_probability,
      top_influencing_features: doc.top_influencing_features || []
    }
  end
end