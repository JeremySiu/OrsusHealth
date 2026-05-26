class EhrDocument
  include Mongoid::Document
  include Mongoid::Timestamps

  FEATURE_KEYS = %w[
    Age Sex ChestPainType RestingBP Cholesterol FastingBS
    RestingECG MaxHR ExerciseAngina Oldpeak ST_Slope
  ].freeze

  field :hospital_id, type: String
  field :status, type: String
  field :payload, type: Hash
  field :features, type: Hash
  field :feature_provenance, type: Hash
  field :heart_disease_probability, type: Float
  field :top_influencing_features, type: Array

  def self.complete_features(mapped)
    normalized = mapped.stringify_keys
    FEATURE_KEYS.index_with { |key| normalized.key?(key) ? normalized[key] : nil }
  end

  def self.complete_feature_provenance(provenance)
    normalized = (provenance || {}).stringify_keys
    FEATURE_KEYS.index_with do |key|
      entry = normalized[key]
      entry.is_a?(Hash) ? entry : { "source" => nil, "className" => nil }
    end
  end
end
