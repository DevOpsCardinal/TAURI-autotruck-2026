import { BackgroundLayout } from '../components/BackgroundLayout/BackgroundLayout';
import { CompanyBrandSection } from '../components/CompanyBrandSection/CompanyBrandSection';
import { LoginCard } from '../components/LoginCard/LoginCard';
import { LoginForm } from '../components/LoginForm/LoginForm';
import { LoginResponse, LicenseInfo } from '../types/auth.types';
import logoSrc from '../../../assets/img/logoCardinal4.png';
import bg1 from '../../../assets/img/fondoCardinal2.jpg';
import bg2 from '../../../assets/img/fondoCardinal4.jpg';
import bg3 from '../../../assets/img/camion.jpg';

const SLIDESHOW_IMAGES = [bg1, bg2, bg3];

interface LoginPageProps {
  licenseInfo: LicenseInfo | null;
  licenseNotFound?: boolean;
  licenseLoading?: boolean;
  onLoginSuccess: (response: LoginResponse) => void;
}

export function LoginPage({
  licenseInfo,
  licenseNotFound = false,
  licenseLoading = false,
  onLoginSuccess,
}: LoginPageProps) {
  const isExpired = licenseInfo?.status === 'expired' || licenseNotFound;

  return (
    <BackgroundLayout>
      <CompanyBrandSection
        logoSrc={logoSrc}
        images={SLIDESHOW_IMAGES}
        companyName="Cardinal Weighing Colombia"
        tagline="Sistema de Control de Básculas"
      />
      <LoginCard
        logoSrc={logoSrc}
        licenseWarning={licenseInfo}
        licenseNotFound={licenseNotFound}
        licenseLoading={licenseLoading}
      >
        <LoginForm
          onSuccess={onLoginSuccess}
          disabled={isExpired}
        />
      </LoginCard>
    </BackgroundLayout>
  );
}
