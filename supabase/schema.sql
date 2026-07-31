-- Create the media table
CREATE TABLE media (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('movie', 'movies', 'tv', 'anime', 'book', 'books', 'game', 'games')),
  title text NOT NULL,
  release_year integer,
  poster_url text,
  backdrop_url text,
  external_id text,
  rating decimal,
  review text,
  is_logged boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Row Level Security (RLS)
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Create policies (assuming single user or public read/write for this demo)
CREATE POLICY "Enable read access for all users" ON media FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON media FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON media FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON media FOR DELETE USING (true);
