UPDATE products SET image_url = CASE
  WHEN id IN ('d608cd91-22aa-4545-97be-124c1b554f4a','e8d658e5-d8b8-4580-a643-e3d7537e84f7','40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002') THEN 'https://ycxfyyhxgsbjoiijxgyu.supabase.co/storage/v1/object/public/product-images/catalog/jewelry-earring.jpg'
  WHEN id IN ('a2f96392-1b7f-4f5a-a5f1-ea69f791e6af','5f53dbb0-6c20-4582-83ec-d083bfbe8db9') THEN 'https://ycxfyyhxgsbjoiijxgyu.supabase.co/storage/v1/object/public/product-images/catalog/jewelry-pendant.jpg'
  WHEN id IN ('cb912443-903c-426c-bf2e-e30c9aed7320','30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001') THEN 'https://ycxfyyhxgsbjoiijxgyu.supabase.co/storage/v1/object/public/product-images/catalog/jewelry-ring.jpg'
  WHEN id IN ('0870f2df-a81a-4648-9279-cab5f2fed48e','073fba9e-342a-4c02-957b-85e86c5fc093') THEN 'https://ycxfyyhxgsbjoiijxgyu.supabase.co/storage/v1/object/public/product-images/catalog/jewelry-bracelet.jpg'
  WHEN id = '10000000-0000-0000-0000-000000000003' THEN 'https://ycxfyyhxgsbjoiijxgyu.supabase.co/storage/v1/object/public/product-images/catalog/jewelry-necklace.jpg'
  ELSE image_url
END;