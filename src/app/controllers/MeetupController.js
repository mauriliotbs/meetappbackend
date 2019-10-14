import * as Yup from 'yup';
import { Op } from 'sequelize';
import { isBefore, parseISO } from 'date-fns';
import Meetup from '../models/Meetup';
import File from '../models/File';

class MeetupController {
  async store(request, response) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      location: Yup.string().required(),
      date: Yup.date().required(),
      image_id: Yup.number().required(),
    });

    if (!(await schema.isValid(request.body))) {
      return response.status(400).json({ error: 'Meetup is not valid' });
    }

    const { date } = request.body;

    /**
     * Check if meetup date is not a past date
     */

    const checkDate = isBefore(parseISO(date), new Date());

    if (checkDate) {
      return response
        .status(400)
        .json({ error: 'Meetup must not have a past date' });
    }

    const meetup = await Meetup.create({
      ...request.body,
      user_id: request.userId,
    });

    return response.json(meetup);
  }

  async update(request, response) {
    const schema = Yup.object().shape({
      title: Yup.string(),
      description: Yup.string(),
      location: Yup.string(),
      date: Yup.date(),
      image_id: Yup.number(),
    });

    if (!(await schema.isValid(request.body))) {
      return response
        .status(400)
        .json({ error: 'Meetup changes are not valid' });
    }

    const { date } = request.body;
    const { id } = request.params;

    /**
     * Check if meetup date is not a past date
     */

    const checkDate = isBefore(parseISO(date), new Date());

    if (checkDate) {
      return response
        .status(400)
        .json({ error: 'Meetup must not have a past date' });
    }

    /**
     * Check if meetup exists and if user is the organizer
     */

    const meetup = await Meetup.findOne({
      where: {
        id,
        user_id: request.userId,
      },
    });

    if (!meetup) {
      return response
        .status(400)
        .json({ error: 'Meetup with this organizer does not exist' });
    }

    await meetup.update(request.body);

    /**
     * Return meetup with changes
     */

    return response.json(meetup);
  }

  async index(request, response) {
    const meetups = await Meetup.findAll({
      where: {
        user_id: request.userId,
        date: {
          [Op.gte]: new Date(),
        },
      },
      include: [
        {
          model: File,
          required: true,
          attributes: ['id', 'path', 'url'],
        },
      ],
      order: [['date', 'ASC']],
    });

    return response.json(meetups);
  }

  async delete(request, response) {
    const { id } = request.params;

    /**
     * Check if meetup exists and if user is the organizer
     */

    const meetup = await Meetup.findOne({
      where: {
        id,
        user_id: request.userId,
      },
    });

    if (!meetup) {
      return response
        .status(400)
        .json({ error: 'Meetup with this organizer does not exist' });
    }

    /**
     * Check if meetup date is not a past date
     */

    const checkDate = isBefore(meetup.date, new Date());

    if (checkDate) {
      return response
        .status(400)
        .json({ error: 'Meetup must not have a past date' });
    }

    await meetup.destroy();

    return response.json({
      message: `Meetup (${meetup.title}) has been cancelled`,
    });
  }
}

export default new MeetupController();
