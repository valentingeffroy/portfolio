Rails.application.routes.draw do
  get 'pages/contact', to: 'pages#about', as: :about
  get 'pages/about', to: 'pages#contact', as: :contact

  root to: 'pages#home'
  # For details on the DSL available within this file, see https://guides.rubyonrails.org/routing.html
end
