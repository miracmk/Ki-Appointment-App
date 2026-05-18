import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    // Here you would typically save to database or send email
    // For now, we'll just return success
    
    return NextResponse.json({ 
      success: true, 
      message: 'Thank you for your inquiry! We will contact you shortly.' 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}