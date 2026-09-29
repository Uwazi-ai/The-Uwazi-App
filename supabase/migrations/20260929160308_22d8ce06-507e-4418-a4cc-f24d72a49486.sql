update compass_questions set prompt_text = v.t from (values
(1,'City and county leaders should show how they spend our tax money.'),
(2,'Leaders should work hard to bring good-paying jobs to my area.'),
(3,'Feeling safe in my neighborhood is one of my biggest worries.'),
(4,'Rent and home prices cost too much where I live.'),
(5,'Good public schools are key to my community''s future.'),
(6,'Leaders should make health care and mental health help easier to afford.'),
(7,'Fixing roads, sidewalks, and buses should be a top job in my area.'),
(8,'Voting in local elections makes a real difference where I live.'),
(9,'I trust local leaders to make good choices without people checking on them.'),
(10,'Helping small local businesses matters more to me than most issues.'),
(11,'My area is already safe, so safety is not a big issue for me.'),
(12,'New buildings in my area should be homes people can afford.'),
(13,'Kids and teens here need more safe places and programs after school.'),
(14,'Staying healthy is up to each person. Leaders should not focus on it.'),
(15,'It should be easier to get around my city without a car.'),
(16,'Going to community meetings or calling leaders is a waste of my time.')
) as v(o,t) where compass_questions.order_index = v.o;