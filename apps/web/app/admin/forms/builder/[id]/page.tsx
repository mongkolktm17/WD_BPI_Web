'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import FormBuilderEditor from '@/components/forms/FormBuilderEditor';

export default function FormBuilderEditPage() {
  const params = useParams();
  const id = params?.id ? Number(params.id) : undefined;

  return <FormBuilderEditor initialId={id} />;
}
