import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const FALLBACK_SERVICE_ACCOUNT = {
  type: 'service_account',
  project_id: 'ki-business-consulting',
  private_key_id: 'ee08a47a5ab2f9c20dae86217bdb1f8cfe2fc4bd',
  private_key:
    '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC/uE59DKSDuMkX\nW2r7azT/b3sa/EHnDDuIUnMYuvDfGFLhgQiva0GsIsHfnpyeYSDpSKrOB36HLgh0\ntbiom7k5gynlElIwLlWP/0gXgK7zGoCMLsq6u4BMn1NcfCQU8w7nrc+2DPqpJiND\nh+vHweTKxETo+EeKRbkTGRyJB3Ev6cNoY7JNh7nmV7Abt9eaCx1HdYzDtH6u767P\nCsC47MU6AlQIwOJbH1nzEi3eEqnwFAmTmvBc+/yPE7uD/lTqsEUcGOmK7vnJqRUU\nlUa7Sg32FrvHbNHu/az61JLCC8YzViBiLD6fdemqHmHr2/tLi9sMQUenZadGKORd\n9zsJw5+tAgMBAAECggEAFpD5HBr62k5LzSYDh6hsyowyr1B16V41O6yIw6ZtZ7UT\nPFvVy+ASENLegxXGVZYVK6BUCoAzUnIGqMYjACWkPbLEoaPwbJ9njtV7hNiuvwql\nitqPHj+nsF0okMBD9vtNC9QXmNQaRQKqL+61wAOAjKVhfxKKSSo/yJGyHCb2Ga9z\n4oa0T0s3P8GsNENMqmKXJNUur0Sy/wbkQmqmduwertUg8s2QOi9Ypad1qqU2BVb4\nlYj3vcCC/Fw2a/amZ75c77NcPqBvOK+TZVOV/0dnhrGAalwcBuY297CY4UFKNyxw\n+l2v2RlmQAQIpVc1odbc3+baeLW9ptPwPZ7tRfCDQQKBgQDy9n8/VGMwOkPgRG/P\nU5AoaBnDX7MIcM4lpZb3aNVxz3/iXJUFWE+FE9Td6AArd9fSPJjljRrPsXWNeL3g\nTex24TJkK9Pb3svMqiz3s40ANXDSGCuTAk587Fk/StXERLzY1dnKb6G/MKl7GmEe\n34FAoD4omzFBzd423BV2yjilKQKBgQDKAebgjghgsBh1k3b+VHF7GPWWqraVpWks\n/jagtPVbJmrSlEKYUs4lBGedSDZyLCOYKTnAyE4AkOrhgp71S9S1RZOfhdhZ0J7j\nw7ZztKjZg40NdtIO+EqjJnTvclwwgqecaYVJ0JvWREhX8Dcg4k0mxmvHYjeA/ujP\nCk5BqgMS5QKBgFD6TTD7XE/Pq53M0YNFc6+z+po+hDpU9rBff3CYlUNoiFQWzWhJ\npb9R+8m2MJBMUjd1EPS5Ue1VVTvAuXBQKHb62cO/Q85tdHmTYodwZZdjOGYdvjAy\nPZyvXZOVyqeuzU5sADnTeRJzEpnAEgyrK7YxcmYwS3uGNQEN222LOtP5AoGAO2sV\nyyVcB3ykpSjsDmEuRAQScO/j5t6Rsj9QODMiHF6Pe0NK11077519EMFl6m1bRu2R\nZEhG0VnPDOgL86ELfwppIroO6lQ3+EzgBOa1580PF0/E98xGv/iW2rurrEUyIgrT\nvuOSgxLwqJUq0gxenzIsD6ivJM1WE1g3ro7gepUCgYEAxaUW4xt6X3kwRJahDJM3\n+VxPjOo5yk/9c0DIFF/PIccEOmrb/TF9smH7MUSoDKwG0FMXwL+tVtyIzHjPxBLD\n09gHvMI2dS5T8VCzUBMNYMmLMPzaxiXDZZgcqu1PZ42yRTev+BNXbh1YbYlMTG6j\na5ToZ8XThk8djwlfcK0/eUQ=\n-----END PRIVATE KEY-----\n',
  client_email:
    'firebase-adminsdk-fbsvc@ki-business-consulting.iam.gserviceaccount.com',
  client_id: '113204945847931767224',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url:
    'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40ki-business-consulting.iam.gserviceaccount.com',
  universe_domain: 'googleapis.com',
};

export function getFirebaseAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const parsedKey = envKey ? JSON.parse(envKey) : FALLBACK_SERVICE_ACCOUNT;

  return initializeApp({
    credential: cert(parsedKey as Parameters<typeof cert>[0]),
    projectId: process.env.FIREBASE_PROJECT_ID ?? 'ki-business-consulting',
  });
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getFirebaseAdminApp());
}
