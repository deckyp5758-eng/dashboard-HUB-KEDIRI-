import dappLogo from '../assets/images/dapp-logo.png';

interface DAppLogoProps {
  className?: string;
}

export default function DAppLogo({ className = "h-10 w-auto" }: DAppLogoProps) {
  return (
    <img
      src={dappLogo}
      alt="DApp logo"
      className={`object-contain ${className}`}
    />
  );
}
