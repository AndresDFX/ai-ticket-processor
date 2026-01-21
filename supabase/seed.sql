-- Datos de prueba para vivatori
insert into public.tickets (description, category, sentiment, processed)
values
  ('No puedo acceder a mi cuenta desde el móvil', 'Técnico', 'Negativo', true),
  ('Necesito factura de este mes', 'Facturación', 'Neutral', true),
  ('¿Tienen descuentos para empresas?', 'Comercial', 'Positivo', false);
