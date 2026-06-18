import type { MenuItem } from "@/types/admin";

const placeholderImages = [
  "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=640&q=80",
  "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=640&q=80",
  "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=640&q=80",
  "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=640&q=80"
];

type ApiDrink = {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  is_available: boolean;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export async function getDrinks(signal?: AbortSignal): Promise<MenuItem[]> {
  const response = await fetch(`${apiBaseUrl}/api/drinks`, {
    cache: "no-store",
    signal
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch drinks: ${response.status}`);
  }

  const drinks = (await response.json()) as ApiDrink[];

  return drinks.map((drink, index) => ({
    id: String(drink.id),
    name: drink.name,
    category: drink.category,
    price: Number(drink.price),
    description: drink.description,
    imageUrl: drink.image_url || placeholderImages[index % placeholderImages.length],
    soldToday: 0,
    stock: drink.is_available ? "normal" : "sold-out"
  }));
}
