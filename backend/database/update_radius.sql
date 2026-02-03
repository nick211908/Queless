-- Update the service to be accessible from anywhere (Earth radius approx 6000km, so 20000km covers all)
update services 
set presence_radius = 20000000.0, 
    status = 'OPEN'; -- ensure open matches
