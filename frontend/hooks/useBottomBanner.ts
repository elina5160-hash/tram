import useSWR, { mutate } from 'swr';

export interface BannerItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  enabled: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useBottomBanner() {
  const { data, error, isLoading } = useSWR<BannerItem[]>('/api/settings/bottom-banner', fetcher);

  const updateBanner = async (items: BannerItem[]) => {
    const res = await fetch('/api/settings/bottom-banner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    });
    if (res.ok) {
      mutate('/api/settings/bottom-banner');
      return await res.json();
    }
    throw new Error('Failed to update banner');
  };

  return {
    items: data || [],
    isLoading,
    isError: error,
    updateBanner,
  };
}
