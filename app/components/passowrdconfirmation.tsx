type PasswordConfirmationProps = {
  password: string;
  confirmPassword: string;
};

const PasswordConfirmation = ({ password, confirmPassword }: PasswordConfirmationProps) => {
  if (!confirmPassword) return null;

  const passwordsMatch = password === confirmPassword;

  return (
    <p aria-live="polite" className={`mt-2 text-xs ${passwordsMatch ? 'text-[#286454]' : 'text-[#a43f34]'}`}>
      {passwordsMatch ? 'Passwords match.' : 'Passwords do not match.'}
    </p>
  );
};

export default PasswordConfirmation;