drop policy "Trainers can manage exercises" on "public"."exercise";

drop policy "Users can view their threads" on "public"."message_thread";

drop policy "Trainers can manage all prompts" on "public"."prompt";

drop policy "Users can view their custom prompts" on "public"."prompt";

drop policy "Users can create messages in their threads" on "public"."message";

drop policy "Users can view messages in their threads" on "public"."message";

drop policy "Trainers can view all threads" on "public"."message_thread";

drop policy "Users can create their threads" on "public"."message_thread";

drop policy "Users can view global prompts" on "public"."prompt";

drop policy "Trainers can create users" on "public"."user";

drop policy "Trainers can view all users" on "public"."user";

drop policy "Users can update their own data" on "public"."user";

drop policy "Users can view their own data" on "public"."user";

create policy "Enable delete for users based on user_id"
on "public"."message_thread"
as permissive
for delete
to service_role
using (NULL::boolean);


create policy "Enable update for users based on email"
on "public"."message_thread"
as permissive
for update
to service_role
using (NULL::boolean)
with check (NULL::boolean);


create policy "Users can create messages in their threads"
on "public"."message"
as permissive
for insert
to service_role
with check ((EXISTS ( SELECT 1
   FROM message_thread mt
  WHERE (mt.id = message.message_thread_id))));


create policy "Users can view messages in their threads"
on "public"."message"
as permissive
for select
to service_role
using ((EXISTS ( SELECT 1
   FROM message_thread mt
  WHERE (mt.id = message.message_thread_id))));


create policy "Trainers can view all threads"
on "public"."message_thread"
as permissive
for select
to service_role
using (NULL::boolean);


create policy "Users can create their threads"
on "public"."message_thread"
as permissive
for insert
to service_role
with check (NULL::boolean);


create policy "Users can view global prompts"
on "public"."prompt"
as permissive
for select
to service_role
using (NULL::boolean);


create policy "Trainers can create users"
on "public"."user"
as permissive
for insert
to service_role
with check ((EXISTS ( SELECT 1
   FROM "user" user_1
  WHERE (user_1.role = 'trainer'::user_role))));


create policy "Trainers can view all users"
on "public"."user"
as permissive
for select
to service_role
using ((EXISTS ( SELECT 1
   FROM "user" user_1
  WHERE (user_1.role = 'trainer'::user_role))));


create policy "Users can update their own data"
on "public"."user"
as permissive
for update
to service_role
using (NULL::boolean);


create policy "Users can view their own data"
on "public"."user"
as permissive
for select
to service_role
using (NULL::boolean);



