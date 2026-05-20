import Homepage from '@/app/homepage';

type LocalePageProps = {
  params: {
    locale: string;
  };
};

export default function LocalePage({ params }: LocalePageProps) {
  return <Homepage locale={params.locale} />;
}
