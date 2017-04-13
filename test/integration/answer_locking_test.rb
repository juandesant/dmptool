require 'test_helper'

class AnswerLockingTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    scaffold_template
    scaffold_plan
    @question = Question.create(text: 'Test question', section: @plan.template.phases.first.sections.first, 
                                question_format: QuestionFormat.where(option_based: false).first, number: 99)
                                                                        
    @collaborator = (User.first == @plan.owner ? User.last : User.first)
    
    # Make the 2nd user an editor of the plan
    Role.create!(user_id: @collaborator.id, plan_id: @plan.id, access: 4)
    @plan.reload
  end
  
  # ----------------------------------------------------------
  test 'user receives a lock notification if the answer was CREATED while they were working' do
    userA = Answer.new(user: @plan.owner, plan: @plan, question: @question, 
                       text: "Initial answer - by UserA")
    
    userB = Answer.new(user: @collaborator, plan: @plan, question: @question,
                       text: "Version conflict at onset - by UserB")
    
    # Signin as UserA and insert the new answer
    sign_in @plan.owner
    put answer_path(FastGettext.locale, userA, format: "js"), obj_to_params(userA.attributes)
    assert_response :success
    assert_equal "text/javascript", @response.content_type
    updated = Answer.find_by(plan: @plan, question: @question)
    assert_equal "Initial answer - by UserA", updated.text
    assert_equal @plan.owner.id, updated.user_id
    
    # Make sure the answer-notice is NOT displayed
    assert_not @response.body.include?(_('Combine their changes with your answer below and then save the answer again.'))
    
    
    # Signin as UserB and try to insert the new answer but fail
    sign_in @collaborator
    put answer_path(FastGettext.locale, userB, format: "js"), obj_to_params(userB.attributes)
    assert_response :success
    assert_equal "text/javascript", @response.content_type
    updated = Answer.find_by(plan: @plan, question: @question)
    assert_equal "Initial answer - by UserA", updated.text
    assert_equal @plan.owner.id, updated.user_id

    # Make sure the answer-notice IS displayed
    assert @response.body.include?(_('Combine their changes with your answer below and then save the answer again.'))
  end
  
  # ----------------------------------------------------------
  test 'user receives a lock notification if the answer was UPDATED while they were working' do
    userA = Answer.create!(user: @plan.owner, plan: @plan, question: @question, 
                           text: "Initial answer - by UserA").attributes
    userB = userA.clone
   
puts userA.inspect
puts userB.inspect
    
    # Signin as UserA and insert the new answer
    sign_in @plan.owner
    userA['text'] += " - Updated by userA"
    
    put answer_path(FastGettext.locale, userA['id'], format: "js"), obj_to_params(userA)
    assert_response :success
    assert_equal "text/javascript", @response.content_type
    updated = Answer.find_by(plan: @plan, question: @question)
    assert_equal "Initial answer - by UserA - Updated by userA", updated.text
    assert_equal @plan.owner.id, updated.user_id
    
    # Make sure the answer-notice is NOT displayed
    assert_not @response.body.include?(_('Combine their changes with your answer below and then save the answer again.'))
    
    
    # Signin as UserB and try to insert the new answer but fail
    sign_in @collaborator
    userB['text'] += " - Updated by userB"
    
    put answer_path(FastGettext.locale, userB['id'], format: "js"), obj_to_params(userB)
    assert_response :success
    assert_equal "text/javascript", @response.content_type
    updated = Answer.find_by(plan: @plan, question: @question)
    assert_equal "Initial answer - by UserA - Updated by userA", updated.text
    assert_equal @plan.owner.id, updated.user_id

    # Make sure the answer-notice IS displayed
    assert @response.body.include?(_('Combine their changes with your answer below and then save the answer again.'))
    
  end

# ----------------------------------------------------------  
  private
    def obj_to_params(attributes)
      {"answer-text-#{attributes['question_id']}": "#{attributes['text']}", 
       answer: {id: attributes['id'],
                user_id: attributes['user_id'], 
                plan_id: attributes['plan_id'], 
                question_id: attributes['question_id']}
      }
    end
end
