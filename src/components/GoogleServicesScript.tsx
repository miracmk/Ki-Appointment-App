'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { getFirestoreClient } from '@/lib/firebase-client';
import { doc, getDoc } from 'firebase/firestore';

interface GoogleConfig {
  ga4_id: string;
  gtm_id: string;
  gsc_verification: string;
}

export default function GoogleServicesScript() {
  const [cfg, setCfg] = useState<GoogleConfig>({ ga4_id: '', gtm_id: '', gsc_verification: '' });

  useEffect(() => {
    (async () => {
      const db = getFirestoreClient();
      if (!db) return;
      try {
        const snap = await getDoc(doc(db, 'platform_settings', 'config'));
        if (snap.exists()) {
          const d = snap.data();
          setCfg({
            ga4_id:           d.ga4_id           ?? '',
            gtm_id:           d.gtm_id           ?? '',
            gsc_verification: d.gsc_verification ?? '',
          });
        }
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    if (!cfg.gsc_verification) return;
    if (document.querySelector('meta[name="google-site-verification"]')) return;
    const meta = document.createElement('meta');
    meta.name    = 'google-site-verification';
    meta.content = cfg.gsc_verification;
    document.head.appendChild(meta);
  }, [cfg.gsc_verification]);

  return (
    <>
      {cfg.ga4_id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${cfg.ga4_id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${cfg.ga4_id}');`}
          </Script>
        </>
      )}
      {cfg.gtm_id && (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${cfg.gtm_id}');`}
        </Script>
      )}
    </>
  );
}
