import React from 'react';
import { NewsSection } from '../components/NewsSection';

export const News = () => {
  return (
    <div className="py-8">
      <NewsSection limit={50} />
    </div>
  );
};
