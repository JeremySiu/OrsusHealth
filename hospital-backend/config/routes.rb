Rails.application.routes.draw do
  # Creates the API routes (api/v1/ehr_imports) that maps to the create action for the EHR controller action
  # Only allows the create action instead of creating all the other RESTful actions (e.g. update, destroy, show, etc)
  namespace :api do
    namespace :v1 do
      resources :ehr_imports, only: [:create]
    end
  end
end