export function useAuth() {
  return {
    user: {
      id: 'preview-user',
      user_metadata: {
        full_name: 'Preview Patient',
      },
    },
  };
}
