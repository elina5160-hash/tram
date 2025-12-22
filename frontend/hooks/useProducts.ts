import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url, { headers: { 'Cache-Control': 'no-cache' } }).then((res) => res.json());

export function useProducts() {
  const { data, error, isLoading } = useSWR('/api/products', fetcher, {
    revalidateOnFocus: true, 
    revalidateOnReconnect: true,
    keepPreviousData: true, 
  });

  const addProduct = async (product: Record<string, unknown>) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (res.ok) {
      await mutate('/api/products');
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add product');
  };

  const updateProduct = async (id: number, updates: Record<string, unknown>) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      await mutate('/api/products');
      return await res.json();
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update product');
  };

  const deleteProduct = async (id: number) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await mutate('/api/products');
      return true;
    }
    throw new Error('Failed to delete product');
  };

  return {
    products: data || [],
    isLoading,
    isError: error,
    addProduct,
    updateProduct,
    deleteProduct,
  };
}
