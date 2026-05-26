require "httparty"

module Ehr::Operation
  class Process < Trailblazer::Operation
    step :save_raw_document
    step :map_features_via_express
    step :generate_ml_predictions
    step :finalize_document

    def save_raw_document(ctx, params:, **)
      ctx[:document] = EhrDocument.create!(
        hospital_id: params[:hospital_id],
        status: "processing",
        payload: params[:fhir_payload]
      )
    end

    def map_features_via_express(ctx, params:, **)
        response = HTTParty.post("http://localhost:4000/api/extract",
        body: { fhir_payload: params[:fhir_payload] }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      return false unless response.success?

      ctx[:mapped_features] = response.parsed_response["features"]
      ctx[:feature_provenance] = response.parsed_response["feature_provenance"]
    end

    def generate_ml_predictions(ctx, **)
      response = HTTParty.post(
        "#{ENV["ML_API_BASE_URL"]}/predict",
        body: ctx[:mapped_features].to_json,
        headers: {
          "Content-Type" => "application/json",
          "x-api-key" => ENV["APP_API_KEY"]
        }
      )

      return false unless response.success?

      ctx[:ml_results] = response.parsed_response
    end

    def finalize_document(ctx, document:, mapped_features:, feature_provenance:, ml_results:, **)
      document.update!(
        status: "completed",
        features: EhrDocument.complete_features(mapped_features),
        feature_provenance: EhrDocument.complete_feature_provenance(feature_provenance),
        heart_disease_probability: ml_results["heart_disease_probability"],
        top_influencing_features: ml_results["top_influencing_features"]
      )
    end
  end
end
