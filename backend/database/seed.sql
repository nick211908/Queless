-- Insert a Demo Service
insert into public.services (id, name, latitude, longitude, presence_radius, status)
values 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Main Clinic', 37.7749, -122.4194, 500.0, 'OPEN');

-- Insert Counters for that service
insert into public.counters (service_id, name, status)
values
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Counter 1', 'FREE'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Counter 2', 'OFFLINE');
